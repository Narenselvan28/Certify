"""
Certify Backend — Retry & Error Classification Utility
Classifies errors encountered during email delivery to prevent endless retries on permanent failures.
"""

# HTTP status codes that represent transient, retryable failures
RETRYABLE_HTTP_STATUSES = {408, 429, 500, 502, 503, 504}

# Known permanent error codes
PERMANENT_CODES = {
    "CONFIG_MISSING",
    "INVALID_EMAIL",
    "INVALID_ATTACHMENT",
    "ATTACHMENT_TOO_LARGE",
    "UNAUTHORIZED",
    "400",
    "401",
    "403",
    "404",
}


def is_retryable_error(error_code: str | int | None, error_message: str | None = None) -> bool:
    """
    Determine if an error is transient and can be retried,
    or permanent and must not be retried.
    """
    code_str = str(error_code).strip() if error_code is not None else ""
    msg_str = (error_message or "").lower()

    # Explicit permanent codes
    if code_str in PERMANENT_CODES:
        return False

    # Check for permanent keywords in message
    permanent_keywords = [
        "invalid email",
        "invalid address",
        "credentials not configured",
        "authentication failed",
        "unauthorized",
        "forbidden",
        "bad request",
        "attachment too large",
        "exceeds limit",
        "no recipient",
        "malformed",
    ]
    if any(k in msg_str for k in permanent_keywords):
        return False

    # Explicit retryable HTTP codes
    try:
        if int(code_str) in RETRYABLE_HTTP_STATUSES:
            return True
    except (ValueError, TypeError):
        pass

    # Check for transient keywords in code or message
    combined = f"{code_str} {msg_str}".lower()
    transient_keywords = [
        "timeout",
        "timed out",
        "rate limit",
        "too many requests",
        "429",
        "connection reset",
        "connection refused",
        "network error",
        "network_error",
        "temporary",
        "try again",
        "server error",
        "500",
        "502",
        "503",
        "504",
    ]
    if any(k in combined for k in transient_keywords):
        return True

    return False
