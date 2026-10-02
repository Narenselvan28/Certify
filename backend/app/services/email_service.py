"""
Certify Backend — Brevo Transactional Email Service
Encapsulates all interaction with Brevo REST API (v3/smtp/email).
Provider credentials remain strictly backend-only.
"""

import asyncio
import logging
import uuid
from typing import TypedDict
import httpx

from app.config import settings
from app.utils.email_val import normalize_and_validate_email
from app.utils.retry import is_retryable_error

logger = logging.getLogger(__name__)

BREVO_API_URL = "https://api.brevo.com/v3/smtp/email"


class EmailSendResult(TypedDict):
    success: bool
    message_id: str | None
    error: str | None
    code: str | None
    retryable: bool
    test_mode: bool


async def send_certificate_email(
    recipient_email: str,
    recipient_name: str,
    subject: str,
    body: str,
    pdf_base64: str,
    filename: str,
) -> EmailSendResult:
    """
    Deliver certificate PDF to participant via Brevo Transactional Email REST API.
    Provider-independent interface for Certify.

    Parameters:
    - recipient_email: target email address
    - recipient_name: participant name for greeting
    - subject: email subject line
    - body: plain-text email message
    - pdf_base64: base64 string of the PDF (with or without data URI prefix)
    - filename: sanitized attachment filename (e.g. John_Doe_Certificate.pdf)
    """
    # 1. Validate email syntax before sending
    val = normalize_and_validate_email(recipient_email)
    if not val["is_valid"]:
        return {
            "success": False,
            "message_id": None,
            "error": val["reason"] or "Invalid email address",
            "code": "INVALID_EMAIL",
            "retryable": False,
            "test_mode": settings.BREVO_TEST_MODE,
        }

    clean_email = val["normalized"]

    # 2. Clean base64 attachment data (strip any data:application/pdf;base64, prefix)
    clean_b64 = pdf_base64
    if "," in clean_b64:
        clean_b64 = clean_b64.split(",", 1)[1]
    clean_b64 = clean_b64.strip()

    # 3. Check attachment size against MAX_CERTIFICATE_SIZE_MB
    # Base64 string length is approximately 4/3 of byte size
    approx_bytes = len(clean_b64) * 3 / 4
    max_bytes = settings.MAX_CERTIFICATE_SIZE_MB * 1024 * 1024
    if approx_bytes > max_bytes:
        return {
            "success": False,
            "message_id": None,
            "error": f"Certificate exceeds email attachment size limit ({settings.MAX_CERTIFICATE_SIZE_MB}MB)",
            "code": "ATTACHMENT_TOO_LARGE",
            "retryable": False,
            "test_mode": settings.BREVO_TEST_MODE,
        }

    # 4. Handle TEST MODE simulation
    if settings.BREVO_TEST_MODE:
        delay_sec = max(0.01, settings.EMAIL_SEND_DELAY_MS / 1000.0)
        await asyncio.sleep(delay_sec)
        simulated_id = f"test_simulated_{uuid.uuid4().hex[:10]}"
        logger.info(
            "[TEST MODE] Simulated email to %s <%s> with attachment %s (ID: %s)",
            recipient_name,
            clean_email,
            filename,
            simulated_id,
        )
        return {
            "success": True,
            "message_id": simulated_id,
            "error": None,
            "code": None,
            "retryable": False,
            "test_mode": True,
        }

    # 5. Live Mode — check Brevo configuration
    if not settings.is_configured:
        logger.error("Brevo API credentials missing in backend configuration.")
        return {
            "success": False,
            "message_id": None,
            "error": "Brevo API key or sender email is not configured.",
            "code": "CONFIG_MISSING",
            "retryable": False,
            "test_mode": False,
        }

    # 6. Dispatch transactional email via Brevo REST API
    headers = {
        "accept": "application/json",
        "api-key": settings.BREVO_API_KEY,
        "content-type": "application/json",
    }

    payload = {
        "sender": {
            "name": settings.BREVO_SENDER_NAME,
            "email": settings.BREVO_SENDER_EMAIL,
        },
        "to": [
            {
                "email": clean_email,
                "name": recipient_name[:100],
            }
        ],
        "subject": subject[:250],
        "textContent": body,
        "attachment": [
            {
                "name": filename,
                "content": clean_b64,
            }
        ],
    }

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(BREVO_API_URL, json=payload, headers=headers)

        if resp.status_code in (200, 201, 202):
            data = resp.json() if resp.text else {}
            msg_id = data.get("messageId", f"brevo_{uuid.uuid4().hex[:10]}")
            logger.info("Delivered email to %s <%s> via Brevo (ID: %s)", recipient_name, clean_email, msg_id)
            return {
                "success": True,
                "message_id": msg_id,
                "error": None,
                "code": None,
                "retryable": False,
                "test_mode": False,
            }

        # Error handling based on Brevo response code
        status_code = resp.status_code
        err_msg = ""
        try:
            err_data = resp.json()
            err_msg = err_data.get("message") or err_data.get("code") or resp.text
        except Exception:
            err_msg = resp.text

        logger.warning(
            "Brevo delivery failure HTTP %d for %s: %s",
            status_code,
            clean_email,
            err_msg[:200],
        )

        retryable = is_retryable_error(status_code, err_msg)

        return {
            "success": False,
            "message_id": None,
            "error": f"Brevo HTTP {status_code}: {err_msg[:160]}",
            "code": str(status_code),
            "retryable": retryable,
            "test_mode": False,
        }

    except httpx.TimeoutException:
        logger.warning("Brevo request timed out for recipient %s", clean_email)
        return {
            "success": False,
            "message_id": None,
            "error": "Brevo connection timed out",
            "code": "TIMEOUT",
            "retryable": True,
            "test_mode": False,
        }

    except httpx.NetworkError as exc:
        logger.warning("Network error reaching Brevo: %s", exc)
        return {
            "success": False,
            "message_id": None,
            "error": "Network error reaching Brevo",
            "code": "NETWORK_ERROR",
            "retryable": True,
            "test_mode": False,
        }

    except Exception as exc:
        logger.exception("Unexpected error dispatching Brevo email: %s", exc)
        return {
            "success": False,
            "message_id": None,
            "error": f"Unexpected error: {str(exc)[:150]}",
            "code": "INTERNAL_ERROR",
            "retryable": False,
            "test_mode": False,
        }
