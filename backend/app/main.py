"""
Certify Backend — FastAPI Application Entry Point
Streamlined backend for bulk certificate delivery via Brevo Transactional Email API.
"""

import base64
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, PlainTextResponse

from app.config import settings
from app.schemas import (
    EmailStatusResponse,
    EmailTestRequest,
    EmailTestResponse,
    DeliveryValidateRequest,
    DeliveryValidateResponse,
    DeliveryStartRequest,
    DeliveryStartResponse,
    DeliveryStatusResponse,
    DeliveryResultsResponse,
    DeliveryRetryResponse,
)
from app.services.email_service import send_certificate_email
from app.services.delivery_service import delivery_service

# ── Logging ────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


# ── Lifespan ───────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    mode = "TEST MODE (Simulated)" if settings.BREVO_TEST_MODE else "PRODUCTION (Live Brevo API)"
    logger.info("🚀 Certify Backend starting [Provider: Brevo | Mode: %s]", mode)
    yield
    logger.info("Certify Backend shutting down.")


# ── App ────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="Certify Brevo Email Delivery Backend",
    description="Stateless in-memory delivery service for bulk certificate delivery via Brevo Transactional Email.",
    version="3.0.0",
    docs_url="/docs",
    redoc_url=None,
    lifespan=lifespan,
)

# ── CORS ───────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type", "Accept"],
)


# ── Global error handler ───────────────────────────────────────────────────
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.exception("Unhandled exception on %s %s: %s", request.method, request.url.path, exc)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"success": False, "error": "Internal server error.", "code": "INTERNAL_ERROR"},
    )


# ── Health ─────────────────────────────────────────────────────────────────
@app.get("/health", tags=["Health"])
async def health():
    """Health check endpoint. Never exposes any secrets."""
    return {
        "status": "ok",
        "provider": "brevo",
        "configured": settings.is_configured,
        "test_mode": settings.BREVO_TEST_MODE,
        "sender_email": settings.BREVO_SENDER_EMAIL or None,
    }


# ── Brevo Email Admin Endpoints ────────────────────────────────────────────

@app.get(
    "/api/email/status",
    response_model=EmailStatusResponse,
    tags=["Email"],
    summary="Check Brevo connection & configuration status",
)
async def get_email_status() -> EmailStatusResponse:
    """
    Returns Brevo configuration status without revealing the API key.
    """
    return EmailStatusResponse(
        provider="brevo",
        configured=settings.is_configured,
        test_mode=settings.BREVO_TEST_MODE,
        sender_email=settings.BREVO_SENDER_EMAIL or None,
        sender_name=settings.BREVO_SENDER_NAME or None,
    )


@app.post(
    "/api/email/test",
    response_model=EmailTestResponse,
    tags=["Email"],
    summary="Send a single test email to verify Brevo configuration",
)
async def send_test_email(req: EmailTestRequest) -> EmailTestResponse:
    """
    Dispatches a single test email with sample certificate to verify Brevo connection.
    Does not require generating an entire certificate batch.
    """
    # Create a minimal 1-page valid PDF header for the test email attachment
    minimal_sample_pdf_bytes = (
        b"%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n"
        b"2 0 obj<</Type/Pages/Count 1/Kids[3 0 R]>>endobj\n"
        b"3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Resources<<>>>>endobj\n"
        b"xref\n0 4\n0000000000 65535 f\n0000000010 00000 n\n0000000053 00000 n\n0000000102 00000 n\n"
        b"trailer<</Size 4/Root 1 0 R>>\nstartxref\n178\n%%EOF\n"
    )
    sample_b64 = base64.b64encode(minimal_sample_pdf_bytes).decode("ascii")

    res = await send_certificate_email(
        recipient_email=req.recipient_email,
        recipient_name=req.recipient_name,
        subject="Certify Test Certificate",
        body=(
            f"Hello {req.recipient_name},\n\n"
            f"This is a test certificate email from Certify.\n"
            f"If you received this, your Brevo email configuration is working correctly!\n\n"
            f"Regards,\n{settings.BREVO_SENDER_NAME}"
        ),
        pdf_base64=sample_b64,
        filename="Sample_Certificate.pdf",
    )

    if res["success"]:
        return EmailTestResponse(
            success=True,
            message="Test email sent successfully" if not res["test_mode"] else "Test email simulated successfully (Test Mode)",
            message_id=res["message_id"],
            test_mode=res["test_mode"],
        )
    else:
        return EmailTestResponse(
            success=False,
            message=res["error"] or "Failed to send test email",
            message_id=None,
            test_mode=res["test_mode"],
        )


# ── Bulk Delivery API Endpoints ────────────────────────────────────────────

@app.post(
    "/api/delivery/validate",
    response_model=DeliveryValidateResponse,
    tags=["Delivery"],
    summary="Preflight validation for bulk delivery",
)
async def validate_delivery(req: DeliveryValidateRequest) -> DeliveryValidateResponse:
    """
    Validate participant email addresses and certificate attachment sizes
    before starting bulk delivery.
    """
    return delivery_service.validate_batch(req)


@app.post(
    "/api/delivery/start",
    response_model=DeliveryStartResponse,
    tags=["Delivery"],
    summary="Start background bulk email delivery",
)
async def start_delivery(req: DeliveryStartRequest) -> DeliveryStartResponse:
    """
    Enqueue certificates for sequential rate-controlled delivery via Brevo.
    """
    if not req.participants:
        raise HTTPException(status_code=400, detail="Participant list cannot be empty")

    delivery_id = delivery_service.start_delivery(participants=req.participants)

    return DeliveryStartResponse(
        delivery_id=delivery_id,
        total=len(req.participants),
        message="Delivery session initiated",
    )


@app.get(
    "/api/delivery/{delivery_id}/status",
    response_model=DeliveryStatusResponse,
    tags=["Delivery"],
    summary="Get real-time delivery status and progress",
)
async def get_delivery_status(delivery_id: str) -> DeliveryStatusResponse:
    """
    Polling endpoint returning total, pending, processing, sent, failed, retrying,
    skipped counts, progress percentage, and currently sending recipient info.
    """
    st = delivery_service.get_status(delivery_id)
    if not st:
        raise HTTPException(status_code=404, detail="Delivery session not found or expired")
    return st


@app.get(
    "/api/delivery/{delivery_id}/results",
    response_model=DeliveryResultsResponse,
    tags=["Delivery"],
    summary="Get final delivery results breakdown",
)
async def get_delivery_results(delivery_id: str) -> DeliveryResultsResponse:
    """
    Detailed breakdown of all jobs with per-participant delivery status,
    attempt counts, and errors.
    """
    res = delivery_service.get_results(delivery_id)
    if not res:
        raise HTTPException(status_code=404, detail="Delivery session not found or expired")
    return res


@app.post(
    "/api/delivery/{delivery_id}/retry",
    response_model=DeliveryRetryResponse,
    tags=["Delivery"],
    summary="Retry transient failed deliveries",
)
async def retry_failed_deliveries(delivery_id: str) -> DeliveryRetryResponse:
    """
    Retry only jobs that encountered retryable failures (e.g. 429 rate limit,
    temporary server errors, timeouts). Permanent errors (invalid email address)
    will not be re-attempted.
    """
    count = delivery_service.retry_failed(delivery_id)
    return DeliveryRetryResponse(
        delivery_id=delivery_id,
        retrying_count=count,
        message=f"Retrying {count} failed jobs" if count > 0 else "No retryable failed jobs found",
    )


@app.get(
    "/api/delivery/{delivery_id}/report",
    tags=["Delivery"],
    summary="Download delivery CSV report",
)
async def download_delivery_report(delivery_id: str):
    """
    Generate and stream a CSV delivery report containing every participant,
    email, status, attempt count, error, and timestamp.
    """
    csv_content = delivery_service.generate_csv_report(delivery_id)
    if not csv_content:
        raise HTTPException(status_code=404, detail="Delivery session not found or expired")

    return PlainTextResponse(
        content=csv_content,
        media_type="text/csv",
        headers={
            "Content-Disposition": f'attachment; filename="delivery_report_{delivery_id}.csv"'
        },
    )
