"""
Certify Backend — Delivery Service
Manages in-memory delivery sessions, sequential rate-controlled sending via Brevo,
transient error retries with exponential backoff, progress tracking, and CSV reporting.
NO DATABASE — Stateless, session exists in memory.
"""

import asyncio
import csv
import io
import logging
import re
import time
import uuid
from datetime import datetime, timezone
from typing import Any

from app.config import settings
from app.schemas import (
    DeliveryParticipant,
    DeliveryValidateRequest,
    DeliveryValidateResponse,
    ValidationProblem,
    DeliveryStatusResponse,
    CurrentlySendingInfo,
    DeliveryJobResult,
    DeliverySummary,
    DeliveryResultsResponse,
)
from app.services.email_service import send_certificate_email
from app.utils.email_val import normalize_and_validate_email

logger = logging.getLogger(__name__)


def sanitize_filename(name: str, reg_no: str | None) -> str:
    """Create a safe, sanitized filename: {Name}_{RegNo}_Certificate.pdf"""
    parts = [name.strip()]
    if reg_no and reg_no.strip():
        parts.append(reg_no.strip())
    parts.append("Certificate")

    raw = "_".join(parts)
    clean = re.sub(r"[^\w\-.]", "_", raw)
    clean = re.sub(r"_+", "_", clean)
    return f"{clean}.pdf"


class DeliverySession:
    def __init__(self, delivery_id: str, jobs: list[dict]):
        self.delivery_id = delivery_id
        self.jobs = jobs
        self.created_at = time.time()
        self.updated_at = time.time()
        self.is_complete = False
        self.currently_sending: dict | None = None
        self.task: asyncio.Task | None = None

    def get_status_summary(self) -> dict:
        total = len(self.jobs)
        pending = sum(1 for j in self.jobs if j["status"] == "PENDING")
        processing = sum(1 for j in self.jobs if j["status"] == "PROCESSING")
        sent = sum(1 for j in self.jobs if j["status"] == "SENT")
        failed = sum(1 for j in self.jobs if j["status"] == "FAILED")
        retrying = sum(1 for j in self.jobs if j["status"] == "RETRYING")
        skipped = sum(1 for j in self.jobs if j["status"] == "SKIPPED")

        done = sent + failed + skipped
        progress = round((done / total * 100.0), 1) if total > 0 else 100.0
        complete = self.is_complete or (pending == 0 and processing == 0 and retrying == 0)

        return {
            "total": total,
            "pending": pending,
            "processing": processing,
            "sent": sent,
            "failed": failed,
            "retrying": retrying,
            "skipped": skipped,
            "progress": progress,
            "is_complete": complete,
        }


class DeliveryService:
    def __init__(self):
        self._sessions: dict[str, DeliverySession] = {}

    def _cleanup_old_sessions(self):
        """Remove sessions older than 2 hours to prevent unbounded memory growth."""
        now = time.time()
        expired = [sid for sid, s in self._sessions.items() if now - s.created_at > 7200]
        for sid in expired:
            if self._sessions[sid].task and not self._sessions[sid].task.done():
                self._sessions[sid].task.cancel()
            del self._sessions[sid]

    def validate_batch(self, req: DeliveryValidateRequest) -> DeliveryValidateResponse:
        """
        Validate participants before starting delivery.
        Checks email syntax and certificate size limits.
        """
        total = len(req.participants)
        email_ready = 0
        email_invalid = 0
        certs_ready = 0
        certs_invalid = 0
        problems: list[ValidationProblem] = []

        max_bytes = settings.MAX_CERTIFICATE_SIZE_MB * 1024 * 1024

        for p in req.participants:
            # 1. Email address check
            e_val = normalize_and_validate_email(p.email)
            if e_val["is_valid"]:
                email_ready += 1
            else:
                email_invalid += 1
                problems.append(
                    ValidationProblem(
                        index=p.index,
                        name=p.name,
                        channel="email",
                        reason=e_val["reason"] or "Invalid email address",
                    )
                )

            # 2. Certificate size check
            if p.certificate_size_bytes is not None:
                if p.certificate_size_bytes > max_bytes:
                    certs_invalid += 1
                    problems.append(
                        ValidationProblem(
                            index=p.index,
                            name=p.name,
                            channel="certificate",
                            reason=f"Size ({p.certificate_size_bytes/(1024*1024):.1f}MB) exceeds limit ({settings.MAX_CERTIFICATE_SIZE_MB}MB)",
                        )
                    )
                else:
                    certs_ready += 1
            else:
                certs_ready += 1

        can_proceed = email_ready > 0

        return DeliveryValidateResponse(
            total=total,
            email_ready=email_ready,
            email_invalid=email_invalid,
            certificates_ready=certs_ready,
            certificates_invalid=certs_invalid,
            problems=problems,
            can_proceed=can_proceed,
        )

    def start_delivery(self, participants: list[DeliveryParticipant]) -> str:
        """
        Create a new in-memory delivery session and start the background queue.
        """
        self._cleanup_old_sessions()
        delivery_id = uuid.uuid4().hex[:12]
        now_str = datetime.now(timezone.utc).isoformat()

        jobs = []
        for idx, p in enumerate(participants):
            job = {
                "id": f"job_{delivery_id}_{idx+1:04d}",
                "participant_id": p.id or f"p_{idx+1}",
                "sno": p.sno or str(idx + 1),
                "name": p.name,
                "email": p.email,
                "reg_no": p.reg_no,
                "department": p.department,
                "event_name": p.event_name,
                "certificate": {
                    "filename": p.certificate.filename,
                    "base64": p.certificate.base64,
                },
                "status": "PENDING",
                "attempts": 0,
                "error": None,
                "error_code": None,
                "retryable": False,
                "updated_at": now_str,
            }
            jobs.append(job)

        session = DeliverySession(delivery_id=delivery_id, jobs=jobs)
        self._sessions[delivery_id] = session

        session.task = asyncio.create_task(self._process_session(session))
        return delivery_id

    async def _process_session(self, session: DeliverySession, target_jobs: list[dict] | None = None):
        """Sequential rate-controlled delivery worker for the session."""
        jobs_to_process = target_jobs if target_jobs is not None else session.jobs
        logger.info("DeliverySession %s: Processing %d jobs", session.delivery_id, len(jobs_to_process))

        max_retries = max(1, settings.MAX_EMAIL_RETRIES)
        delay_sec = max(0.01, settings.EMAIL_SEND_DELAY_MS / 1000.0)

        for job in jobs_to_process:
            if job["status"] in ("SENT", "SKIPPED"):
                continue

            session.updated_at = time.time()
            clean_email = (job.get("email") or "").strip()

            session.currently_sending = {
                "participant_name": job["name"],
                "email": clean_email or "No email",
                "attempt": 1,
            }

            # 1. Pre-validation of email syntax
            email_val = normalize_and_validate_email(clean_email)
            if not email_val["is_valid"]:
                job["status"] = "SKIPPED"
                job["error"] = email_val["reason"] or "Invalid email address"
                job["error_code"] = "INVALID_EMAIL"
                job["retryable"] = False
                job["updated_at"] = datetime.now(timezone.utc).isoformat()
                logger.info("Skipping participant %s: %s", job["name"], job["error"])
                continue

            # 2. Build email subject & body
            event_name = (job.get("event_name") or "").strip()
            subject = f"Your Certificate – {event_name}" if event_name else "Your Certificate"

            body = (
                f"Dear {job['name']},\n\n"
                f"Thank you for participating in {event_name or 'the event'}.\n\n"
                f"Please find your certificate attached to this email.\n\n"
                f"We appreciate your participation and congratulate you on your achievement.\n\n"
                f"Regards,\n"
                f"{settings.BREVO_SENDER_NAME}"
            )

            # 3. Sanitize filename
            filename = sanitize_filename(job["name"], job.get("reg_no"))

            # 4. Controlled send with exponential backoff on retryable failures
            success = False
            last_error = None
            last_code = None
            last_retryable = False

            for attempt in range(1, max_retries + 1):
                job["attempts"] = attempt
                session.currently_sending["attempt"] = attempt

                if attempt > 1:
                    job["status"] = "RETRYING"
                    backoff = min(6.0, 1.5 ** (attempt - 1))
                    logger.info("Retrying participant %s (attempt %d/%d) in %.1fs", job["name"], attempt, max_retries, backoff)
                    await asyncio.sleep(backoff)
                else:
                    job["status"] = "PROCESSING"

                res = await send_certificate_email(
                    recipient_email=email_val["normalized"],
                    recipient_name=job["name"],
                    subject=subject,
                    body=body,
                    pdf_base64=job["certificate"]["base64"],
                    filename=filename,
                )

                if res["success"]:
                    success = True
                    break

                last_error = res["error"]
                last_code = res["code"]
                last_retryable = res["retryable"]

                # If permanent failure (e.g. invalid email / key / attachment), stop retrying
                if not last_retryable:
                    logger.info("Non-retryable error for %s: %s", job["name"], last_error)
                    break

            now_str = datetime.now(timezone.utc).isoformat()
            job["updated_at"] = now_str

            if success:
                job["status"] = "SENT"
                job["error"] = None
                job["error_code"] = None
                job["retryable"] = False
            else:
                job["status"] = "FAILED"
                job["error"] = last_error or "Delivery failed"
                job["error_code"] = last_code
                job["retryable"] = last_retryable

            # Inter-message controlled delay
            await asyncio.sleep(delay_sec)

        session.is_complete = True
        session.currently_sending = None
        session.updated_at = time.time()
        logger.info("DeliverySession %s complete.", session.delivery_id)

    def get_status(self, delivery_id: str) -> DeliveryStatusResponse | None:
        session = self._sessions.get(delivery_id)
        if not session:
            return None

        st = session.get_status_summary()
        current = None
        if session.currently_sending:
            current = CurrentlySendingInfo(
                participant_name=session.currently_sending["participant_name"],
                email=session.currently_sending["email"],
                attempt=session.currently_sending.get("attempt", 1),
            )

        return DeliveryStatusResponse(
            delivery_id=session.delivery_id,
            total=st["total"],
            pending=st["pending"],
            processing=st["processing"],
            sent=st["sent"],
            failed=st["failed"],
            retrying=st["retrying"],
            skipped=st["skipped"],
            progress=st["progress"],
            currently_sending=current,
            is_complete=st["is_complete"],
        )

    def get_results(self, delivery_id: str) -> DeliveryResultsResponse | None:
        session = self._sessions.get(delivery_id)
        if not session:
            return None

        st = session.get_status_summary()
        results = [
            DeliveryJobResult(
                id=j["id"],
                participant_id=j["participant_id"],
                sno=j.get("sno"),
                name=j["name"],
                email=j.get("email"),
                reg_no=j.get("reg_no"),
                department=j.get("department"),
                status=j["status"],
                attempts=j["attempts"],
                error=j.get("error"),
                error_code=j.get("error_code"),
                retryable=j.get("retryable", False),
                timestamp=j.get("updated_at", ""),
            )
            for j in session.jobs
        ]

        summary = DeliverySummary(
            total=st["total"],
            sent=st["sent"],
            failed=st["failed"],
            skipped=st["skipped"],
        )

        return DeliveryResultsResponse(
            delivery_id=session.delivery_id,
            summary=summary,
            results=results,
        )

    def retry_failed(self, delivery_id: str) -> int:
        session = self._sessions.get(delivery_id)
        if not session:
            return 0

        retryable_jobs = [j for j in session.jobs if j["status"] == "FAILED" and j.get("retryable", False)]
        if not retryable_jobs:
            return 0

        for j in retryable_jobs:
            j["status"] = "PENDING"
            j["error"] = None
            j["error_code"] = None
            j["attempts"] = 0

        session.is_complete = False
        session.task = asyncio.create_task(self._process_session(session, target_jobs=retryable_jobs))
        return len(retryable_jobs)

    def generate_csv_report(self, delivery_id: str) -> str | None:
        session = self._sessions.get(delivery_id)
        if not session:
            return None

        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["S.No", "Name", "Reg No", "Department", "Email", "Status", "Attempts", "Error", "Timestamp"])

        for j in session.jobs:
            writer.writerow([
                j.get("sno") or "",
                j.get("name") or "",
                j.get("reg_no") or "",
                j.get("department") or "",
                j.get("email") or "",
                j.get("status") or "",
                j.get("attempts", 0),
                j.get("error") or "",
                j.get("updated_at") or "",
            ])

        return output.getvalue()


delivery_service = DeliveryService()
