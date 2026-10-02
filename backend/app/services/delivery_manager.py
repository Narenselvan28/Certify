"""
Certify Backend — Delivery Manager
Session manager for in-memory delivery sessions. NO DATABASE required.
"""

import asyncio
import csv
import io
import logging
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
from app.services.delivery_queue import DeliveryQueue
from app.utils.phone import normalize_and_validate_phone
from app.utils.email_val import normalize_and_validate_email

logger = logging.getLogger(__name__)


class DeliverySession:
    def __init__(
        self,
        delivery_id: str,
        channels: list[str],
        enable_fallback: bool,
        jobs: list[dict],
    ):
        self.delivery_id = delivery_id
        self.channels = channels
        self.enable_fallback = enable_fallback
        self.jobs = jobs
        self.created_at = time.time()
        self.updated_at = time.time()
        self.is_complete = False
        self.currently_sending: dict | None = None
        self.queue: DeliveryQueue | None = None
        self.task: asyncio.Task | None = None

    def on_job_update(self, job: dict):
        self.updated_at = time.time()
        if job["status"] in ("PROCESSING", "RETRYING"):
            self.currently_sending = {
                "participant_name": job["name"],
                "channel": job.get("channel", "unknown"),
                "recipient": job.get("phone") or job.get("email") or "—",
                "attempt": job.get("attempts", 1),
            }
        elif self.currently_sending and self.currently_sending["participant_name"] == job["name"]:
            self.currently_sending = None

    def on_queue_complete(self):
        self.is_complete = True
        self.currently_sending = None
        self.updated_at = time.time()
        logger.info("DeliverySession %s: All jobs processed.", self.delivery_id)

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

        return {
            "total": total,
            "pending": pending,
            "processing": processing,
            "sent": sent,
            "failed": failed,
            "retrying": retrying,
            "skipped": skipped,
            "progress": progress,
            "is_complete": self.is_complete or (pending == 0 and processing == 0 and retrying == 0),
        }


class DeliveryManager:
    def __init__(self):
        self._sessions: dict[str, DeliverySession] = {}

    def _cleanup_old_sessions(self):
        """Remove sessions older than 2 hours to avoid memory growth."""
        now = time.time()
        expired = [sid for sid, s in self._sessions.items() if now - s.created_at > 7200]
        for sid in expired:
            if self._sessions[sid].task and not self._sessions[sid].task.done():
                self._sessions[sid].task.cancel()
            del self._sessions[sid]

    def validate_batch(self, req: DeliveryValidateRequest) -> DeliveryValidateResponse:
        """
        Validate participants before bulk delivery.
        Checks WhatsApp phone numbers, email addresses, and certificate sizes.
        """
        total = len(req.participants)
        wa_ready = 0
        wa_invalid = 0
        em_ready = 0
        em_invalid = 0
        certs_ready = 0
        certs_invalid = 0
        problems: list[ValidationProblem] = []

        max_bytes = settings.MAX_CERTIFICATE_SIZE_MB * 1024 * 1024

        for p in req.participants:
            # WhatsApp validation
            if "whatsapp" in req.channels:
                p_val = normalize_and_validate_phone(p.phone)
                if p_val["is_valid"]:
                    wa_ready += 1
                else:
                    wa_invalid += 1
                    problems.append(
                        ValidationProblem(
                            index=p.index,
                            name=p.name,
                            channel="whatsapp",
                            reason=p_val["reason"] or "Invalid phone number",
                        )
                    )

            # Email validation
            if "email" in req.channels:
                e_val = normalize_and_validate_email(p.email)
                if e_val["is_valid"]:
                    em_ready += 1
                else:
                    em_invalid += 1
                    problems.append(
                        ValidationProblem(
                            index=p.index,
                            name=p.name,
                            channel="email",
                            reason=e_val["reason"] or "Invalid email address",
                        )
                    )

            # Certificate size check
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

        can_proceed = (wa_ready > 0 if "whatsapp" in req.channels else True) and (
            em_ready > 0 if "email" in req.channels else True
        )

        return DeliveryValidateResponse(
            total=total,
            whatsapp_ready=wa_ready,
            whatsapp_invalid=wa_invalid,
            email_ready=em_ready,
            email_invalid=em_invalid,
            certificates_ready=certs_ready,
            certificates_invalid=certs_invalid,
            problems=problems,
            can_proceed=can_proceed,
        )

    def start_delivery(
        self,
        participants: list[DeliveryParticipant],
        channels: list[str],
        enable_fallback: bool = True,
    ) -> str:
        """
        Create a new in-memory delivery session and start the background queue.
        """
        self._cleanup_old_sessions()

        delivery_id = uuid.uuid4().hex[:12]
        jobs = []

        now_str = datetime.now(timezone.utc).isoformat()

        for idx, p in enumerate(participants):
            job = {
                "id": f"job_{delivery_id}_{idx+1:04d}",
                "participant_id": p.id or f"p_{idx+1}",
                "sno": p.sno or str(idx + 1),
                "name": p.name,
                "phone": p.phone,
                "email": p.email,
                "reg_no": p.reg_no,
                "event_name": p.event_name,
                "certificate": {
                    "filename": p.certificate.filename,
                    "base64": p.certificate.base64,
                },
                "channel": channels[0] if channels else "whatsapp",
                "status": "PENDING",
                "attempts": 0,
                "error": None,
                "error_code": None,
                "retryable": False,
                "fallback_channel": None,
                "fallback_status": None,
                "updated_at": now_str,
            }
            jobs.append(job)

        session = DeliverySession(
            delivery_id=delivery_id,
            channels=channels,
            enable_fallback=enable_fallback,
            jobs=jobs,
        )

        queue = DeliveryQueue(
            concurrency=settings.DELIVERY_CONCURRENCY,
            delay_ms=settings.DELIVERY_DELAY_MS,
            on_job_update=session.on_job_update,
            on_complete=session.on_queue_complete,
        )
        session.queue = queue

        # Launch worker task in background
        task = asyncio.create_task(
            queue.process_jobs(session.jobs, channels, enable_fallback)
        )
        session.task = task

        self._sessions[delivery_id] = session
        logger.info("Started delivery session %s with %d jobs", delivery_id, len(jobs))
        return delivery_id

    def get_session(self, delivery_id: str) -> DeliverySession | None:
        return self._sessions.get(delivery_id)

    def get_status(self, delivery_id: str) -> DeliveryStatusResponse | None:
        session = self.get_session(delivery_id)
        if not session:
            return None

        summary = session.get_status_summary()
        sending_info = None
        if session.currently_sending:
            sending_info = CurrentlySendingInfo(
                participant_name=session.currently_sending["participant_name"],
                channel=session.currently_sending["channel"],
                recipient=session.currently_sending["recipient"],
                attempt=session.currently_sending["attempt"],
            )

        return DeliveryStatusResponse(
            delivery_id=delivery_id,
            total=summary["total"],
            pending=summary["pending"],
            processing=summary["processing"],
            sent=summary["sent"],
            failed=summary["failed"],
            retrying=summary["retrying"],
            skipped=summary["skipped"],
            progress=summary["progress"],
            currently_sending=sending_info,
            is_complete=summary["is_complete"],
        )

    def get_results(self, delivery_id: str) -> DeliveryResultsResponse | None:
        session = self.get_session(delivery_id)
        if not session:
            return None

        st = session.get_status_summary()
        fallback_count = sum(1 for j in session.jobs if j.get("fallback_status") == "SENT")

        wa_sent = sum(1 for j in session.jobs if j.get("channel") == "whatsapp" and j["status"] == "SENT")
        wa_failed = sum(1 for j in session.jobs if j.get("channel") == "whatsapp" and j["status"] == "FAILED")
        wa_skipped = sum(1 for j in session.jobs if j.get("channel") == "whatsapp" and j["status"] == "SKIPPED")

        em_sent = sum(1 for j in session.jobs if j.get("channel") == "email" and j["status"] == "SENT")
        em_failed = sum(1 for j in session.jobs if j.get("channel") == "email" and j["status"] == "FAILED")
        em_skipped = sum(1 for j in session.jobs if j.get("channel") == "email" and j["status"] == "SKIPPED")

        summary = DeliverySummary(
            total=st["total"],
            sent=st["sent"],
            failed=st["failed"],
            skipped=st["skipped"],
            fallback_delivered=fallback_count,
            whatsapp_sent=wa_sent,
            whatsapp_failed=wa_failed,
            whatsapp_skipped=wa_skipped,
            email_sent=em_sent,
            email_failed=em_failed,
            email_skipped=em_skipped,
        )

        results = [
            DeliveryJobResult(
                id=j["id"],
                participant_id=j["participant_id"],
                sno=j.get("sno"),
                name=j["name"],
                phone=j.get("phone"),
                email=j.get("email"),
                reg_no=j.get("reg_no"),
                channel=j.get("channel", "whatsapp"),
                status=j["status"],
                attempts=j["attempts"],
                error=j.get("error"),
                error_code=j.get("error_code"),
                retryable=j.get("retryable", False),
                fallback_channel=j.get("fallback_channel"),
                fallback_status=j.get("fallback_status"),
                updated_at=str(j.get("updated_at", "")),
            )
            for j in session.jobs
        ]

        return DeliveryResultsResponse(
            delivery_id=delivery_id,
            summary=summary,
            results=results,
        )

    def retry_failed(self, delivery_id: str) -> int:
        """
        Retry only retryable failed jobs for a given delivery session.
        """
        session = self.get_session(delivery_id)
        if not session:
            return 0

        retryable_jobs = [
            j for j in session.jobs
            if j["status"] == "FAILED" and j.get("retryable", False)
        ]

        if not retryable_jobs:
            return 0

        for j in retryable_jobs:
            j["status"] = "PENDING"
            j["error"] = None
            j["attempts"] = 0

        session.is_complete = False

        # Queue runner
        queue = DeliveryQueue(
            concurrency=settings.DELIVERY_CONCURRENCY,
            delay_ms=settings.DELIVERY_DELAY_MS,
            on_job_update=session.on_job_update,
            on_complete=session.on_queue_complete,
        )
        session.queue = queue
        session.task = asyncio.create_task(
            queue.process_jobs(retryable_jobs, session.channels, session.enable_fallback)
        )

        return len(retryable_jobs)

    def generate_csv_report(self, delivery_id: str) -> str:
        """
        Generate CSV delivery report for session.
        """
        session = self.get_session(delivery_id)
        if not session:
            return ""

        output = io.StringIO()
        writer = csv.writer(output)

        writer.writerow([
            "S.No",
            "Name",
            "Reg No",
            "Phone",
            "Email",
            "Channel",
            "Status",
            "Attempts",
            "Fallback Channel",
            "Fallback Status",
            "Error",
            "Timestamp",
        ])

        for j in session.jobs:
            writer.writerow([
                j.get("sno", ""),
                j.get("name", ""),
                j.get("reg_no", ""),
                j.get("phone", ""),
                j.get("email", ""),
                j.get("channel", ""),
                j.get("status", ""),
                j.get("attempts", 0),
                j.get("fallback_channel", ""),
                j.get("fallback_status", ""),
                j.get("error", ""),
                j.get("updated_at", ""),
            ])

        return output.getvalue()


# Global in-memory delivery manager singleton
delivery_manager = DeliveryManager()
