"""
Certify Backend — WhatsApp Business Cloud API Integration

All WhatsApp-specific logic is isolated here.
To swap providers, only this file needs to change.
"""

import base64
import io
import logging
import httpx

from app.config import settings

logger = logging.getLogger(__name__)


class WhatsAppError(Exception):
    """Raised when the WhatsApp API returns an error."""
    def __init__(self, message: str, code: str | None = None):
        super().__init__(message)
        self.code = code


async def _upload_media(client: httpx.AsyncClient, pdf_bytes: bytes, filename: str) -> str:
    """
    Upload a PDF to WhatsApp media endpoints and return the media_id.
    The file is processed in memory — never written to disk.
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
        _raise_from_response(resp, "Media upload failed")

    data = resp.json()
    media_id = data.get("id")
    if not media_id:
        raise WhatsAppError("WhatsApp returned no media_id after upload", "MEDIA_UPLOAD_NO_ID")

    return media_id


async def _send_document_message(
    client: httpx.AsyncClient,
    phone: str,
    media_id: str,
    filename: str,
    caption: str,
) -> str:
    """
    Send a document (PDF) via WhatsApp using a media_id.
    Returns the WhatsApp message_id.
    """
    payload = {
        "messaging_product": "whatsapp",
        "recipient_type": "individual",
        "to": phone,
        "type": "document",
        "document": {
            "id": media_id,
            "filename": filename,
            "caption": caption,
        },
    }

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
        _raise_from_response(resp, "Send document failed")

    data = resp.json()
    messages = data.get("messages", [])
    if not messages:
        raise WhatsAppError("WhatsApp returned no message_id", "NO_MESSAGE_ID")

    return messages[0].get("id", "")


async def _send_template_message(
    client: httpx.AsyncClient,
    phone: str,
    name: str,
    event_name: str,
    media_id: str,
    filename: str,
) -> str:
    """
    Send a pre-approved WhatsApp template message with an attached document.
    Falls back to a document-with-caption if template is not configured.

    The template must be pre-approved in the Meta Business Manager.
    Configure CERTIFICATE_TEMPLATE_NAME and CERTIFICATE_TEMPLATE_LANGUAGE in .env.
    """
    template_name = settings.CERTIFICATE_TEMPLATE_NAME
    template_lang = settings.CERTIFICATE_TEMPLATE_LANGUAGE

    if not template_name:
        # Fallback: send as document with caption
        caption = (
            f"Hi {name},\n\n"
            f"Thank you for participating in {event_name}.\n\n"
            f"Please find your participation certificate attached.\n\n"
            f"Regards,\nCertify"
        )
        return await _send_document_message(client, phone, media_id, filename, caption)

    payload = {
        "messaging_product": "whatsapp",
        "recipient_type": "individual",
        "to": phone,
        "type": "template",
        "template": {
            "name": template_name,
            "language": {"code": template_lang},
            "components": [
                {
                    "type": "header",
                    "parameters": [
                        {
                            "type": "document",
                            "document": {
                                "id": media_id,
                                "filename": filename,
                            },
                        }
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
        _raise_from_response(resp, "Template message send failed")

    data = resp.json()
    messages = data.get("messages", [])
    if not messages:
        raise WhatsAppError("WhatsApp returned no message_id", "NO_MESSAGE_ID")

    return messages[0].get("id", "")


def _raise_from_response(resp: httpx.Response, context: str) -> None:
    """Parse WhatsApp error response and raise WhatsAppError."""
    try:
        data = resp.json()
        err = data.get("error", {})
        msg = err.get("message", resp.text)
        code = str(err.get("code", resp.status_code))
        logger.error("%s: [%s] %s", context, code, msg)
        raise WhatsAppError(f"{context}: {msg}", code)
    except (ValueError, KeyError):
        raise WhatsAppError(
            f"{context}: HTTP {resp.status_code}",
            str(resp.status_code),
        )


async def send_certificate_via_whatsapp(
    phone: str,
    name: str,
    event_name: str,
    certificate_b64: str,
    certificate_filename: str,
) -> str:
    """
    Main entry point: decode certificate, upload to WhatsApp, send message.

    1. Decode base64 PDF in memory
    2. Upload to WhatsApp media API  ← temporary in memory only
    3. Send template/document message
    4. Return message_id

    No data is stored to disk. PDF bytes live only in process memory
    for the duration of this coroutine.
    """
    # Decode base64 PDF into bytes
    try:
        pdf_bytes = base64.b64decode(certificate_b64)
    except Exception as exc:
        raise WhatsAppError(f"Invalid base64 certificate data: {exc}", "INVALID_BASE64")

    async with httpx.AsyncClient() as client:
        # 1. Upload PDF temporarily to WhatsApp media servers
        media_id = await _upload_media(client, pdf_bytes, certificate_filename)

        # 2. Send message with the uploaded media
        message_id = await _send_template_message(
            client, phone, name, event_name, media_id, certificate_filename
        )

    # pdf_bytes is now out of scope — eligible for GC
    return message_id
