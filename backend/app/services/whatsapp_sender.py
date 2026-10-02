"""
Certify Backend — WhatsApp Business Cloud API Sender Service
"""

import base64
import io
import logging
import random
from typing import TypedDict
import httpx

from app.config import settings
from app.utils.phone import normalize_and_validate_phone
from app.utils.retry import is_retryable_error

logger = logging.getLogger(__name__)


class WhatsAppSendResult(TypedDict):
    success: bool
    message_id: str | None
    error: str | None
    code: str | None
    retryable: bool


async def _upload_media(client: httpx.AsyncClient, pdf_bytes: bytes, filename: str) -> str:
    """
    Upload PDF in-memory to WhatsApp media endpoint and return media_id.
    """
    files = {
        "file": (filename, io.BytesIO(pdf_bytes), "application/pdf"),
        "messaging_product": (None, "whatsapp"),
        "type": (None, "application/pdf"),
    }
    headers = {"Authorization": f"Bearer {settings.WHATSAPP_ACCESS_TOKEN}"}

    resp = await client.post(
        settings.whatsapp_media_url,
        headers=headers,
        files=files,
        timeout=60.0,
    )

    if resp.status_code != 200:
        data = resp.json() if resp.headers.get("content-type", "").startswith("application/json") else {}
        err = data.get("error", {})
        msg = err.get("message", f"HTTP {resp.status_code}")
        code = str(err.get("code", resp.status_code))
        raise RuntimeError(f"Media upload failed: {msg} [code: {code}]")

    data = resp.json()
    media_id = data.get("id")
    if not media_id:
        raise RuntimeError("Media upload returned no media_id")

    return media_id


async def _send_message_payload(client: httpx.AsyncClient, payload: dict) -> str:
    """Post JSON payload to WhatsApp messages endpoint."""
    headers = {
        "Authorization": f"Bearer {settings.WHATSAPP_ACCESS_TOKEN}",
        "Content-Type": "application/json",
    }
    resp = await client.post(
        settings.whatsapp_api_url,
        headers=headers,
        json=payload,
        timeout=30.0,
    )

    if resp.status_code != 200:
        data = resp.json() if resp.headers.get("content-type", "").startswith("application/json") else {}
        err = data.get("error", {})
        msg = err.get("message", f"HTTP {resp.status_code}")
        code = str(err.get("code", resp.status_code))
        raise RuntimeError(f"Message send failed: {msg} [code: {code}]")

    data = resp.json()
    messages = data.get("messages", [])
    if not messages:
        raise RuntimeError("WhatsApp API returned no message_id")

    return messages[0].get("id", "")


async def send_whatsapp_job(
    phone: str | None,
    name: str,
    event_name: str,
    certificate_b64: str,
    certificate_filename: str,
) -> WhatsAppSendResult:
    """
    Deliver certificate via WhatsApp Cloud API.
    Handles validation, test mode, rate-limits, and error classification.
    """
    # 1. Validate phone
    val = normalize_and_validate_phone(phone)
    if not val["is_valid"]:
        return {
            "success": False,
            "message_id": None,
            "error": val["reason"] or "Invalid phone number",
            "code": "INVALID_PHONE",
            "retryable": False,
        }

    norm_phone = val["normalized"]

    # 2. Test mode simulation
    if settings.WHATSAPP_TEST_MODE:
        # Check simulated failure rate for testing
        if settings.DELIVERY_SIMULATE_FAILURE_RATE > 0:
            if random.random() < settings.DELIVERY_SIMULATE_FAILURE_RATE:
                return {
                    "success": False,
                    "message_id": None,
                    "error": "Simulated transient failure (429 Rate Limit)",
                    "code": "429",
                    "retryable": True,
                }

        logger.info(
            "[WHATSAPP TEST MODE] Simulated delivery to +%s for %s — file=%s",
            norm_phone, name, certificate_filename
        )
        return {
            "success": True,
            "message_id": f"sim_wa_{norm_phone}_{random.randint(1000, 9999)}",
            "error": None,
            "code": None,
            "retryable": False,
        }

    # 3. Check credentials
    missing = settings.validate_whatsapp()
    if missing:
        return {
            "success": False,
            "message_id": None,
            "error": f"WhatsApp credentials missing: {', '.join(missing)}",
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

    # 5. Live WhatsApp Cloud API call
    try:
        async with httpx.AsyncClient() as client:
            media_id = await _upload_media(client, pdf_bytes, certificate_filename)

            template_name = settings.CERTIFICATE_TEMPLATE_NAME
            template_lang = settings.CERTIFICATE_TEMPLATE_LANGUAGE

            if template_name:
                payload = {
                    "messaging_product": "whatsapp",
                    "recipient_type": "individual",
                    "to": norm_phone,
                    "type": "template",
                    "template": {
                        "name": template_name,
                        "language": {"code": template_lang},
                        "components": [
                            {
                                "type": "header",
                                "parameters": [
                                    {"type": "document", "document": {"id": media_id, "filename": certificate_filename}}
                                ],
                            },
                            {
                                "type": "body",
                                "parameters": [
                                    {"type": "text", "text": name},
                                    {"type": "text", "text": event_name},
                                ],
                            },
                        ],
                    },
                }
            else:
                caption = (
                    f"Hi {name},\n\n"
                    f"Thank you for participating in {event_name}.\n\n"
                    f"Please find your certificate attached.\n\n"
                    f"Regards,\nCertify"
                )
                payload = {
                    "messaging_product": "whatsapp",
                    "recipient_type": "individual",
                    "to": norm_phone,
                    "type": "document",
                    "document": {
                        "id": media_id,
                        "filename": certificate_filename,
                        "caption": caption,
                    },
                }

            msg_id = await _send_message_payload(client, payload)
            logger.info("Delivered WhatsApp certificate to +%s: msg_id=%s", norm_phone, msg_id)
            return {
                "success": True,
                "message_id": msg_id,
                "error": None,
                "code": None,
                "retryable": False,
            }

    except Exception as exc:
        err_msg = str(exc)
        logger.error("WhatsApp delivery failed for +%s: %s", norm_phone, err_msg)
        retryable = is_retryable_error(None, err_msg)
        return {
            "success": False,
            "message_id": None,
            "error": err_msg,
            "code": "WHATSAPP_API_ERROR",
            "retryable": retryable,
        }
