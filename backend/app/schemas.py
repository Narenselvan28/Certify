"""
Certify Backend — Request / Response Schemas (Pydantic)
"""

from pydantic import BaseModel, field_validator
import re


class CertificatePayload(BaseModel):
    """Base64-encoded PDF certificate file."""
    filename: str
    base64: str  # base64-encoded PDF bytes

    @field_validator("filename")
    @classmethod
    def validate_filename(cls, v: str) -> str:
        # Strip dangerous path characters
        clean = re.sub(r"[/\\<>:\"|?*]", "_", v.strip())
        if not clean:
            raise ValueError("filename cannot be empty")
        return clean

    @field_validator("base64")
    @classmethod
    def validate_base64_not_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("base64 certificate data cannot be empty")
        # Quick length sanity: 10 MB ≈ 13.5 million base64 chars
        if len(v) > 13_500_000:
            raise ValueError("Certificate exceeds maximum allowed size")
        return v


class SendCertificateRequest(BaseModel):
    """Payload for POST /api/whatsapp/send — one participant at a time."""
    name: str
    phone: str           # E.164 without '+', e.g. "919876543210"
    event_name: str = "your event"
    certificate: CertificatePayload

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("name cannot be empty")
        return v[:200]   # cap at 200 chars

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        digits = re.sub(r"\D", "", v.strip())
        if len(digits) < 10 or len(digits) > 15:
            raise ValueError(f"phone must be 10-15 digits, got {len(digits)}: {v!r}")
        return digits

    @field_validator("event_name")
    @classmethod
    def validate_event_name(cls, v: str) -> str:
        v = v.strip() or "your event"
        return v[:500]


class SendCertificateResponse(BaseModel):
    """Response body for POST /api/whatsapp/send."""
    success: bool
    phone: str
    message_id: str | None = None
    error: str | None = None
    code: str | None = None
    test_mode: bool = False
