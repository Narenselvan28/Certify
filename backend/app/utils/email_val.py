"""
Certify Backend — Email Validation Utility
"""

import re
from typing import TypedDict

# Standard RFC 5322 compatible practical email regex
EMAIL_REGEX = re.compile(
    r"^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$"
)


class EmailValidationResult(TypedDict):
    is_valid: bool
    normalized: str | None
    raw: str
    reason: str | None


def normalize_and_validate_email(raw_email: str | None) -> EmailValidationResult:
    """
    Validate and normalize email address.
    - Strips whitespace
    - Lowercases domain
    - Validates syntax and basic domain structure
    """
    if raw_email is None:
        return {
            "is_valid": False,
            "normalized": None,
            "raw": "",
            "reason": "Email address is missing",
        }

    raw = str(raw_email).strip()
    if not raw:
        return {
            "is_valid": False,
            "normalized": None,
            "raw": "",
            "reason": "Email address is empty",
        }

    if len(raw) > 254:
        return {
            "is_valid": False,
            "normalized": None,
            "raw": raw,
            "reason": "Email address exceeds maximum length (254 characters)",
        }

    if not EMAIL_REGEX.match(raw):
        return {
            "is_valid": False,
            "normalized": None,
            "raw": raw,
            "reason": "Malformed email format",
        }

    parts = raw.split("@")
    if len(parts) != 2:
        return {
            "is_valid": False,
            "normalized": None,
            "raw": raw,
            "reason": "Invalid email structure",
        }

    local_part, domain_part = parts
    domain_part = domain_part.lower().strip()
    normalized = f"{local_part}@{domain_part}"

    return {
        "is_valid": True,
        "normalized": normalized,
        "raw": raw,
        "reason": None,
    }
