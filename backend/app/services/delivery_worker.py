"""
Certify Backend — Delivery Worker
Executes single delivery jobs with exponential backoff and fallback support.
"""

import asyncio
import logging
from typing import Callable, Any

from app.config import settings
from app.services.whatsapp_sender import send_whatsapp_job
from app.services.email_sender import send_email_job
from app.utils.retry import get_retry_delay

logger = logging.getLogger(__name__)


async def execute_delivery_job(
    job: dict,
    channels: list[str],
    enable_fallback: bool,
    on_update: Callable[[dict], Any] | None = None,
) -> dict:
    """
    Execute a delivery job across requested channels.
    Supports retrying transient errors and falling back to alternative channel.
    """
    primary_channel = channels[0] if channels else "whatsapp"
    job["channel"] = primary_channel
    job["status"] = "PROCESSING"
    job["attempts"] = 0
    job["updated_at"] = asyncio.get_event_loop().time()
    if on_update:
        on_update(job)

    max_retries = max(1, settings.MAX_DELIVERY_RETRIES)
    last_error = None
    last_error_code = None
    last_retryable = False

    # ── Primary Channel Execution with Retry ──────────────────────────────────
    while job["attempts"] < max_retries:
        job["attempts"] += 1
        if job["attempts"] > 1:
            job["status"] = "RETRYING"
            if on_update:
                on_update(job)
            delay = get_retry_delay(job["attempts"])
            await asyncio.sleep(delay)

        if primary_channel == "whatsapp":
            res = await send_whatsapp_job(
                phone=job.get("phone"),
                name=job["name"],
                event_name=job.get("event_name", "your event"),
                certificate_b64=job["certificate"]["base64"],
                certificate_filename=job["certificate"]["filename"],
            )
        elif primary_channel == "email":
            res = await send_email_job(
                email=job.get("email"),
                name=job["name"],
                event_name=job.get("event_name", "your event"),
                certificate_b64=job["certificate"]["base64"],
                certificate_filename=job["certificate"]["filename"],
            )
        else:
            res = {
                "success": False,
                "message_id": None,
                "error": f"Unsupported channel: {primary_channel}",
                "code": "UNSUPPORTED_CHANNEL",
                "retryable": False,
            }

        if res["success"]:
            job["status"] = "SENT"
            job["error"] = None
            job["error_code"] = None
            job["retryable"] = False
            job["message_id"] = res.get("message_id")
            if on_update:
                on_update(job)
            return job

        last_error = res["error"]
        last_error_code = res["code"]
        last_retryable = res["retryable"]

        # If error is permanent (e.g. invalid phone/email), break immediately
        if not last_retryable:
            break

    # ── Fallback Channel Execution ────────────────────────────────────────────
    # If primary failed and fallback is enabled, attempt the secondary channel
    fallback_candidate = None
    if enable_fallback:
        if primary_channel == "whatsapp" and job.get("email"):
            fallback_candidate = "email"
        elif primary_channel == "email" and job.get("phone"):
            fallback_candidate = "whatsapp"

    if fallback_candidate:
        job["fallback_channel"] = fallback_candidate
        logger.info(
            "Primary channel '%s' failed for %s. Attempting fallback '%s'...",
            primary_channel, job["name"], fallback_candidate
        )

        if fallback_candidate == "email":
            fb_res = await send_email_job(
                email=job.get("email"),
                name=job["name"],
                event_name=job.get("event_name", "your event"),
                certificate_b64=job["certificate"]["base64"],
                certificate_filename=job["certificate"]["filename"],
            )
        else:
            fb_res = await send_whatsapp_job(
                phone=job.get("phone"),
                name=job["name"],
                event_name=job.get("event_name", "your event"),
                certificate_b64=job["certificate"]["base64"],
                certificate_filename=job["certificate"]["filename"],
            )

        if fb_res["success"]:
            job["status"] = "SENT"
            job["fallback_status"] = "SENT"
            job["error"] = f"Primary ({primary_channel}) failed: {last_error}. Delivered via {fallback_candidate}."
            job["retryable"] = False
            if on_update:
                on_update(job)
            return job
        else:
            job["fallback_status"] = "FAILED"
            job["error"] = f"Both {primary_channel} ({last_error}) and {fallback_candidate} ({fb_res['error']}) failed."

    # Final Failure
    job["status"] = "FAILED"
    job["error"] = job.get("error") or last_error or "Delivery failed"
    job["error_code"] = last_error_code
    job["retryable"] = last_retryable
    if on_update:
        on_update(job)
    return job
