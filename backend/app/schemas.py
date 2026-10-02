"""
Certify Backend — Request / Response Schemas (Pydantic)
"""

import re
from typing import Literal
from pydantic import BaseModel, field_validator


# ── Certificate Payload ───────────────────────────────────────────────────────
class CertificatePayload(BaseModel):
    """Base64-encoded PDF certificate file."""
    filename: str
    base64: str  # base64-encoded PDF bytes

    @field_validator("filename")
    @classmethod
    def validate_filename(cls, v: str) -> str:
        clean = re.sub(r"[/\\<>:\"|?*]", "_", v.strip())
        if not clean:
            raise ValueError("filename cannot be empty")
        return clean

    @field_validator("base64")
    @classmethod
    def validate_base64_not_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("base64 certificate data cannot be empty")
        if len(v) > 14_000_000:
            raise ValueError("Certificate exceeds maximum allowed size (10MB)")
        return v


# ── Legacy Single WhatsApp Request ───────────────────────────────────────────
class SendCertificateRequest(BaseModel):
    """Legacy payload for POST /api/whatsapp/send."""
    name: str
    phone: str
    event_name: str = "your event"
    certificate: CertificatePayload

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("name cannot be empty")
        return v[:200]

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        digits = re.sub(r"\D", "", v.strip())
        if len(digits) < 10 or len(digits) > 15:
            raise ValueError(f"phone must be 10-15 digits, got {len(digits)}")
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


# ── Preflight Validation Schemas ──────────────────────────────────────────────
class ParticipantValidateItem(BaseModel):
    index: int
    name: str
    phone: str | None = None
    email: str | None = None
    certificate_size_bytes: int | None = None


class DeliveryValidateRequest(BaseModel):
    participants: list[ParticipantValidateItem]
    channels: list[str] = ["whatsapp"]  # e.g. ["whatsapp", "email"]


class ValidationProblem(BaseModel):
    index: int
    name: str
    channel: str
    reason: str


class DeliveryValidateResponse(BaseModel):
    total: int
    whatsapp_ready: int
    whatsapp_invalid: int
    email_ready: int
    email_invalid: int
    certificates_ready: int
    certificates_invalid: int
    problems: list[ValidationProblem]
    can_proceed: bool


# ── Bulk Delivery Request / Response Schemas ──────────────────────────────────
class DeliveryParticipant(BaseModel):
    id: str
    sno: str | None = None
    name: str
    phone: str | None = None
    email: str | None = None
    reg_no: str | None = None
    event_name: str = "your event"
    certificate: CertificatePayload


class DeliveryStartRequest(BaseModel):
    participants: list[DeliveryParticipant]
    channels: list[str] = ["whatsapp"]
    enable_fallback: bool = True  # Fallback to email if WhatsApp fails


class DeliveryStartResponse(BaseModel):
    delivery_id: str
    total: int
    message: str


# ── Status & Results Schemas ──────────────────────────────────────────────────
class CurrentlySendingInfo(BaseModel):
    participant_name: str
    channel: str
    recipient: str
    attempt: int


class DeliveryStatusResponse(BaseModel):
    delivery_id: str
    total: int
    pending: int
    processing: int
    sent: int
    failed: int
    retrying: int
    skipped: int
    progress: float
    currently_sending: CurrentlySendingInfo | None = None
    is_complete: bool


class DeliveryJobResult(BaseModel):
    id: str
    participant_id: str
    sno: str | None = None
    name: str
    phone: str | None = None
    email: str | None = None
    reg_no: str | None = None
    channel: str
    status: Literal["PENDING", "PROCESSING", "SENT", "FAILED", "RETRYING", "SKIPPED"]
    attempts: int
    error: str | None = None
    error_code: str | None = None
    retryable: bool = False
    fallback_channel: str | None = None
    fallback_status: str | None = None
    updated_at: str


class DeliverySummary(BaseModel):
    total: int
    sent: int
    failed: int
    skipped: int
    fallback_delivered: int
    whatsapp_sent: int
    whatsapp_failed: int
    whatsapp_skipped: int
    email_sent: int
    email_failed: int
    email_skipped: int


class DeliveryResultsResponse(BaseModel):
    delivery_id: str
    summary: DeliverySummary
    results: list[DeliveryJobResult]


class DeliveryRetryResponse(BaseModel):
    delivery_id: str
    retrying_count: int
    message: str
