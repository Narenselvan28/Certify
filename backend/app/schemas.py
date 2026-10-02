"""
Certify Backend — Request / Response Schemas (Pydantic)
Streamlined specifically for Brevo Transactional Email certificate delivery.
"""

import re
from typing import Literal
from pydantic import BaseModel, field_validator


# ── Certificate Payload ───────────────────────────────────────────────────────
class CertificatePayload(BaseModel):
    """Base64-encoded PDF certificate file."""
    filename: str
    base64: str

    @field_validator("filename")
    @classmethod
    def validate_filename(cls, v: str) -> str:
        # Sanitize filename to prevent directory traversal or illegal characters
        clean = re.sub(r"[/\\<>:\"|?*]", "_", v.strip())
        clean = re.sub(r"\.\.+", ".", clean)
        if not clean:
            clean = "certificate.pdf"
        if not clean.lower().endswith(".pdf"):
            clean = f"{clean}.pdf"
        return clean

    @field_validator("base64")
    @classmethod
    def validate_base64_not_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Certificate base64 data cannot be empty")
        return v


# ── Email Admin & Status Schemas ──────────────────────────────────────────────
class EmailStatusResponse(BaseModel):
    provider: str = "brevo"
    configured: bool
    test_mode: bool
    sender_email: str | None = None
    sender_name: str | None = None


class EmailTestRequest(BaseModel):
    recipient_email: str
    recipient_name: str = "Admin Tester"

    @field_validator("recipient_email")
    @classmethod
    def validate_recipient_email(cls, v: str) -> str:
        clean = v.strip()
        if not clean or "@" not in clean:
            raise ValueError("A valid email address is required for testing")
        return clean


class EmailTestResponse(BaseModel):
    success: bool
    message: str
    message_id: str | None = None
    test_mode: bool = False


# ── Individual Certificate Delivery Schema ────────────────────────────────────
class SendOneRequest(BaseModel):
    recipient_email: str
    recipient_name: str
    subject: str | None = None
    body: str | None = None
    event_name: str | None = "SPECTRUM"
    certificate: CertificatePayload

    @field_validator("recipient_email")
    @classmethod
    def validate_recipient_email(cls, v: str) -> str:
        clean = v.strip()
        if not clean or "@" not in clean:
            raise ValueError("A valid email address is required")
        return clean


class SendOneResponse(BaseModel):
    success: bool
    message: str
    message_id: str | None = None
    test_mode: bool = False


# ── Preflight Validation Schemas ──────────────────────────────────────────────
class ParticipantValidateItem(BaseModel):
    index: int
    name: str
    email: str | None = None
    certificate_size_bytes: int | None = None


class DeliveryValidateRequest(BaseModel):
    participants: list[ParticipantValidateItem]


class ValidationProblem(BaseModel):
    index: int
    name: str
    channel: str = "email"
    reason: str


class DeliveryValidateResponse(BaseModel):
    total: int
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
    email: str | None = None
    reg_no: str | None = None
    department: str | None = None
    event_name: str = "your event"
    certificate: CertificatePayload


class DeliveryStartRequest(BaseModel):
    participants: list[DeliveryParticipant]


class DeliveryStartResponse(BaseModel):
    delivery_id: str
    total: int
    message: str


# ── Status & Results Schemas ──────────────────────────────────────────────────
class CurrentlySendingInfo(BaseModel):
    participant_name: str
    email: str
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
    email: str | None = None
    reg_no: str | None = None
    department: str | None = None
    status: Literal["PENDING", "PROCESSING", "SENT", "FAILED", "RETRYING", "SKIPPED"]
    attempts: int
    error: str | None = None
    error_code: str | None = None
    retryable: bool = False
    timestamp: str


class DeliverySummary(BaseModel):
    total: int
    sent: int
    failed: int
    skipped: int


class DeliveryResultsResponse(BaseModel):
    delivery_id: str
    summary: DeliverySummary
    results: list[DeliveryJobResult]


class DeliveryRetryResponse(BaseModel):
    delivery_id: str
    retrying_count: int
    message: str
