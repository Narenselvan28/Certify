"""
Certify Backend — SMTP Email Delivery Service
"""

import asyncio
import base64
import logging
import random
import smtplib
from email import encoders
from email.mime.base import MIMEBase
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import TypedDict

from app.config import settings
from app.utils.email_val import normalize_and_validate_email
from app.utils.retry import is_retryable_error

logger = logging.getLogger(__name__)


class EmailSendResult(TypedDict):
    success: bool
    message_id: str | None
    error: str | None
    code: str | None
    retryable: bool


def _sync_send_smtp_email(
    to_email: str,
    subject: str,
    body: str,
    pdf_bytes: bytes,
    filename: str,
) -> str:
    """
    Synchronous SMTP dispatch with TLS/SSL and PDF attachment.
    Executed in a background thread via asyncio.to_thread.
    """
    msg = MIMEMultipart()
    msg["From"] = f"{settings.SMTP_FROM_NAME} <{settings.SMTP_FROM_EMAIL}>"
    msg["To"] = to_email
    msg["Subject"] = subject

    # Body
    msg.attach(MIMEText(body, "plain", "utf-8"))

    # Attachment
    part = MIMEBase("application", "pdf")
    part.set_payload(pdf_bytes)
    encoders.encode_base64(part)
    part.add_header("Content-Disposition", f'attachment; filename="{filename}"')
    msg.attach(part)

    # Dispatch via SMTP
    host = settings.SMTP_HOST
    port = settings.SMTP_PORT
    username = settings.SMTP_USERNAME
    password = settings.SMTP_PASSWORD
    use_tls = settings.SMTP_USE_TLS

    if port == 465:
        # SSL
        server = smtplib.SMTP_SSL(host, port, timeout=30.0)
    else:
        # Standard SMTP with optional STARTTLS
        server = smtplib.SMTP(host, port, timeout=30.0)
        if use_tls:
            server.ehlo()
            server.starttls()
            server.ehlo()

    if username and password:
        server.login(username, password)

    server.sendmail(settings.SMTP_FROM_EMAIL, [to_email], msg.as_string())
    server.quit()

    return f"smtp_{random.randint(100000, 999999)}"


async def send_email_job(
    email: str | None,
    name: str,
    event_name: str,
    certificate_b64: str,
    certificate_filename: str,
) -> EmailSendResult:
    """
    Deliver certificate via SMTP Email.
    Handles validation, test mode, attachment formatting, and error classification.
    """
    # 1. Validate email
    val = normalize_and_validate_email(email)
    if not val["is_valid"]:
        return {
            "success": False,
            "message_id": None,
            "error": val["reason"] or "Invalid email address",
            "code": "INVALID_EMAIL",
            "retryable": False,
        }

    norm_email = val["normalized"]

    # 2. Test mode simulation
    if settings.EMAIL_TEST_MODE:
        # Check simulated failure rate for testing
        if settings.DELIVERY_SIMULATE_FAILURE_RATE > 0:
            if random.random() < settings.DELIVERY_SIMULATE_FAILURE_RATE:
                return {
                    "success": False,
                    "message_id": None,
                    "error": "Simulated transient SMTP connection timeout",
                    "code": "504",
                    "retryable": True,
                }

        logger.info(
            "[EMAIL TEST MODE] Simulated email delivery to %s for %s — file=%s",
            norm_email, name, certificate_filename
        )
        return {
            "success": True,
            "message_id": f"sim_email_{norm_email[:6]}_{random.randint(1000, 9999)}",
            "error": None,
            "code": None,
            "retryable": False,
        }

    # 3. Check credentials
    missing = settings.validate_email()
    if missing:
        return {
            "success": False,
            "message_id": None,
            "error": f"SMTP configuration missing: {', '.join(missing)}",
            "code": "CONFIG_MISSING",
            "retryable": False,
        }

    # 4. Decode certificate PDF bytes
    try:
        pdf_bytes = base64.b64decode(certificate_b64)
    except Exception as exc:
        return {
            "success": False,
            "message_id": None,
            "error": f"Corrupt base64 PDF: {exc}",
            "code": "INVALID_BASE64",
            "retryable": False,
        }

    # Check size limit
    max_bytes = settings.MAX_CERTIFICATE_SIZE_MB * 1024 * 1024
    if len(pdf_bytes) > max_bytes:
        return {
            "success": False,
            "message_id": None,
            "error": f"Certificate size ({len(pdf_bytes)/(1024*1024):.1f}MB) exceeds limit ({settings.MAX_CERTIFICATE_SIZE_MB}MB)",
            "code": "PAYLOAD_TOO_LARGE",
            "retryable": False,
        }

    # 5. Build subject & body from templates
    subject = settings.EMAIL_SUBJECT_TEMPLATE.format(
        name=name, event_name=event_name, from_name=settings.SMTP_FROM_NAME
    )
    body = settings.EMAIL_BODY_TEMPLATE.format(
        name=name, event_name=event_name, from_name=settings.SMTP_FROM_NAME
    )

    # 6. Live SMTP dispatch via threadpool
    try:
        msg_id = await asyncio.to_thread(
            _sync_send_smtp_email,
            norm_email,
            subject,
            body,
            pdf_bytes,
            certificate_filename,
        )
        logger.info("Delivered email certificate to %s: msg_id=%s", norm_email, msg_id)
        return {
            "success": True,
            "message_id": msg_id,
            "error": None,
            "code": None,
            "retryable": False,
        }

    except Exception as exc:
        err_msg = str(exc)
        logger.error("Email delivery failed for %s: %s", norm_email, err_msg)
        retryable = is_retryable_error(None, err_msg)
        return {
            "success": False,
            "message_id": None,
            "error": err_msg,
            "code": "SMTP_ERROR",
            "retryable": retryable,
        }
