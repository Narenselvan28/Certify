"""
Certify Backend — Phone Normalization & Validation Utility
"""

import re
from typing import TypedDict


class PhoneValidationResult(TypedDict):
    is_valid: bool
    normalized: str | None
    raw: str
    reason: str | None


def normalize_and_validate_phone(raw_phone: str | None) -> PhoneValidationResult:
    """
    Validate and normalize phone number for WhatsApp delivery.
    - Strips non-digits, Excel '.0' suffix
    - 10-digit Indian numbers get '91' prefix
    - 11-digit 0-prefixed numbers get '0' replaced with '91'
    - 12-digit Indian numbers starting with '91' are preserved
    - 10 to 15 digit international numbers are preserved
    """
    if raw_phone is None:
        return {
            "is_valid": False,
            "normalized": None,
            "raw": "",
            "reason": "Phone number is missing",
        }

    raw = str(raw_phone).strip()
    if not raw:
        return {
            "is_valid": False,
            "normalized": None,
            "raw": "",
            "reason": "Phone number is empty",
        }

    # Clean Excel float artifacts (.0)
    cleaned = re.sub(r"\.0+$", "", raw)
    digits = re.sub(r"\D", "", cleaned)

    if not digits:
        return {
            "is_valid": False,
            "normalized": None,
            "raw": raw,
            "reason": "No digits found in phone number",
        }

    # Indian 10 digits
    if len(digits) == 10:
        return {
            "is_valid": True,
            "normalized": f"91{digits}",
            "raw": raw,
            "reason": None,
        }

    # Indian 11 digits with leading 0
    if len(digits) == 11 and digits.startswith("0"):
        return {
            "is_valid": True,
            "normalized": f"91{digits[1:]}",
            "raw": raw,
            "reason": None,
        }

    # Indian 12 digits with 91
    if len(digits) == 12 and digits.startswith("91"):
        return {
            "is_valid": True,
            "normalized": digits,
            "raw": raw,
            "reason": None,
        }

    # International standard E.164 (10 to 15 digits)
    if 10 <= len(digits) <= 15:
        return {
            "is_valid": True,
            "normalized": digits,
            "raw": raw,
            "reason": None,
        }

    return {
        "is_valid": False,
        "normalized": None,
        "raw": raw,
        "reason": f"Invalid digit count ({len(digits)} digits; expected 10-15)",
    }
