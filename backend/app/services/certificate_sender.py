"""
Certify Backend — Certificate Sender Service

Orchestrates the full send flow:
  receive → validate → send via WhatsApp → return result → discard data
"""

import logging

from app.config import settings
from app.schemas import SendCertificateRequest, SendCertificateResponse
from app.whatsapp import send_certificate_via_whatsapp, WhatsAppError

logger = logging.getLogger(__name__)


async def process_send_request(req: SendCertificateRequest) -> SendCertificateResponse:
    """
    Process a single certificate delivery request.

    In TEST MODE: validates the payload and simulates a successful response
    without calling the WhatsApp API — no real messages are sent.

    In PRODUCTION MODE: calls the WhatsApp Business Cloud API.
    No participant data or certificate is stored after this function returns.
    """

    # ── Test Mode ──────────────────────────────────────────────────────────
    if settings.WHATSAPP_TEST_MODE:
        logger.info(
            "[TEST MODE] Simulated delivery to +%s for '%s' — no real message sent.",
            req.phone, req.name
        )
        return SendCertificateResponse(
            success=True,
            phone=req.phone,
            message_id="test_mode_simulated_id",
            test_mode=True,
        )

    # ── Validate credentials ────────────────────────────────────────────────
    missing = settings.validate()
    if missing:
        return SendCertificateResponse(
            success=False,
            phone=req.phone,
            error=f"WhatsApp credentials not configured: {', '.join(missing)}",
            code="CONFIG_MISSING",
        )

    # ── Send ────────────────────────────────────────────────────────────────
    try:
        message_id = await send_certificate_via_whatsapp(
            phone=req.phone,
            name=req.name,
            event_name=req.event_name,
            certificate_b64=req.certificate.base64,
            certificate_filename=req.certificate.filename,
        )

        logger.info("Sent certificate to +%s — message_id=%s", req.phone, message_id)

        return SendCertificateResponse(
            success=True,
            phone=req.phone,
            message_id=message_id,
        )

    except WhatsAppError as exc:
        # Log internally — DO NOT expose access tokens or internal secrets
        logger.error("WhatsApp delivery failed for +%s: [%s] %s", req.phone, exc.code, exc)
        return SendCertificateResponse(
            success=False,
            phone=req.phone,
            error=str(exc),
            code=exc.code,
        )

    except Exception as exc:
        logger.exception("Unexpected error delivering certificate to +%s", req.phone)
        return SendCertificateResponse(
            success=False,
            phone=req.phone,
            error="An unexpected error occurred. Please try again.",
            code="INTERNAL_ERROR",
        )
