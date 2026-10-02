"""
Certify Backend — Retry & Error Classification Utility
"""

import math

# HTTP status codes that represent transient, retryable failures
RETRYABLE_HTTP_STATUSES = {408, 429, 500, 502, 503, 504}

# Meta / WhatsApp error codes that are transient
RETRYABLE_WHATSAPP_CODES = {
    "130429",  # Rate limit hit
    "131056",  # Too many requests
    "131051",  # Message rate limit exceeded
    "131052",  # Media upload temporary error
    "429",
    "500",
    "502",
    "503",
    "504",
    "TIMEOUT",
    "CONNECTION_ERROR",
}

# Known permanent WhatsApp error codes
PERMANENT_WHATSAPP_CODES = {
    "131026",  # Message undeliverable / invalid recipient
    "131047",  # Re-engagement message / 24-hr window closed without template
    "132000",  # Template does not exist
    "132001",  # Template is paused
    "132005",  # Template parameter count mismatch
    "132007",  # Template language mismatch
    "132012",  # Template header format mismatch
    "132015",  # Template rejected / deleted
    "190",     # Invalid OAuth access token
    "CONFIG_MISSING",
    "INVALID_PHONE",
    "INVALID_BASE64",
    "PAYLOAD_TOO_LARGE",
}

# Known permanent SMTP codes
PERMANENT_SMTP_CODES = {
    550,  # Mailbox unavailable / address rejected
    551,  # User not local
    552,  # Exceeded storage allocation
    553,  # Mailbox name not allowed / invalid address
    554,  # Transaction failed
    535,  # Authentication credentials invalid
    "CONFIG_MISSING",
    "INVALID_EMAIL",
}


def is_retryable_error(error_code: str | int | None, error_message: str | None = None) -> bool:
    """
    Determine if an error is transient and can be retried,
    or permanent and must not be retried.
    """
    code_str = str(error_code).strip() if error_code is not None else ""
    msg_str = (error_message or "").lower()

    # Explicit permanent codes
    if code_str in PERMANENT_WHATSAPP_CODES or code_str in {str(c) for c in PERMANENT_SMTP_CODES}:
        return False

    # Check for permanent keywords in message
    permanent_keywords = [
        "invalid phone",
        "invalid email",
        "invalid address",
        "credentials not configured",
        "authentication failed",
        "unauthorized",
        "template does not exist",
        "template is paused",
        "template rejected",
        "no recipient",
    ]
    if any(k in msg_str for k in permanent_keywords):
        return False

    # Explicit retryable codes
    if code_str in RETRYABLE_WHATSAPP_CODES or code_str in {str(c) for c in RETRYABLE_HTTP_STATUSES}:
        return True

    # Check for transient keywords
    transient_keywords = [
        "timeout",
        "timed out",
        "rate limit",
        "too many requests",
        "429",
        "connection reset",
        "connection refused",
        "temporary",
        "try again",
        "server error",
        "500",
        "502",
        "503",
        "504",
    ]
    if any(k in msg_str for k in transient_keywords):
        return True

    # Default to non-retryable for safety
    return False


def get_retry_delay(attempt: int, base_delay: float = 1.0, max_delay: float = 10.0) -> float:
    """
    Compute exponential backoff delay in seconds:
    Attempt 1: 1.0s
    Attempt 2: 2.0s
    Attempt 3: 4.0s
    Capped at max_delay.
    """
    delay = base_delay * (2 ** max(0, attempt - 1))
    return min(max_delay, delay)
