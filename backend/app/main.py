"""
Certify Backend — FastAPI Application Entry Point
Stateless backend for bulk WhatsApp and Email certificate delivery with queues and retry.
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, Response, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, PlainTextResponse

from app.config import settings
from app.schemas import (
    SendCertificateRequest,
    SendCertificateResponse,
    DeliveryValidateRequest,
    DeliveryValidateResponse,
    DeliveryStartRequest,
    DeliveryStartResponse,
    DeliveryStatusResponse,
    DeliveryResultsResponse,
    DeliveryRetryResponse,
)
from app.services.certificate_sender import process_send_request
from app.services.delivery_manager import delivery_manager

# ── Logging ────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


# ── Lifespan ───────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    wa_mode = "TEST MODE" if settings.WHATSAPP_TEST_MODE else "PRODUCTION"
    em_mode = "TEST MODE" if settings.EMAIL_TEST_MODE else "PRODUCTION"
    logger.info("🚀 Certify Backend starting [WhatsApp: %s | Email: %s]", wa_mode, em_mode)
    yield
    logger.info("Certify Backend shutting down.")


# ── App ────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="Certify Multi-Channel Delivery Backend",
    description="Stateless, in-memory delivery queue for bulk WhatsApp and Email certificate delivery.",
    version="2.0.0",
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
    """Health check endpoint. Does NOT expose any secrets."""
    return {
        "status": "ok",
        "whatsapp_test_mode": settings.WHATSAPP_TEST_MODE,
        "email_test_mode": settings.EMAIL_TEST_MODE,
        "api_version": settings.WHATSAPP_API_VERSION,
        "concurrency": settings.DELIVERY_CONCURRENCY,
    }


# ── Delivery Center API Endpoints ──────────────────────────────────────────

@app.post(
    "/api/delivery/validate",
    response_model=DeliveryValidateResponse,
    tags=["Delivery"],
    summary="Preflight validation for bulk delivery",
)
async def validate_delivery(req: DeliveryValidateRequest) -> DeliveryValidateResponse:
    """
    Validate participant phone numbers, email addresses, and certificate sizes
    before committing to bulk delivery.
    """
    return delivery_manager.validate_batch(req)


@app.post(
    "/api/delivery/start",
    response_model=DeliveryStartResponse,
    tags=["Delivery"],
    summary="Start a background bulk delivery job",
)
async def start_delivery(req: DeliveryStartRequest) -> DeliveryStartResponse:
    """
    Enqueue certificates for delivery via selected channels (WhatsApp, Email)
    with rate control, controlled retries, and fallback channel execution.
    """
    if not req.participants:
        raise HTTPException(status_code=400, detail="Participant list cannot be empty")

    delivery_id = delivery_manager.start_delivery(
        participants=req.participants,
        channels=req.channels,
        enable_fallback=req.enable_fallback,
    )

    return DeliveryStartResponse(
        delivery_id=delivery_id,
        total=len(req.participants),
        message="Delivery queue initiated",
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
    skipped counts, progress percentage, and currently sending participant info.
    """
    st = delivery_manager.get_status(delivery_id)
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
    error messages, attempt counts, and fallback results.
    """
    res = delivery_manager.get_results(delivery_id)
    if not res:
        raise HTTPException(status_code=404, detail="Delivery session not found or expired")
    return res


@app.post(
    "/api/delivery/{delivery_id}/retry",
    response_model=DeliveryRetryResponse,
    tags=["Delivery"],
    summary="Retry temporary/retryable failed deliveries",
)
async def retry_failed_deliveries(delivery_id: str) -> DeliveryRetryResponse:
    """
    Retry only jobs that encountered temporary/retryable failures
    (e.g., 429 rate limit, timeouts, temporary server errors).
    Permanent errors (invalid phone/email) will not be re-attempted.
    """
    count = delivery_manager.retry_failed(delivery_id)
    return DeliveryRetryResponse(
        delivery_id=delivery_id,
        retrying_count=count,
        message=f"Retrying {count} temporary failed jobs" if count > 0 else "No retryable failed jobs found",
    )


@app.get(
    "/api/delivery/{delivery_id}/report",
    tags=["Delivery"],
    summary="Download delivery CSV report",
)
async def download_delivery_report(delivery_id: str):
    """
    Generate and stream a CSV delivery report containing every participant,
    channel, final status, attempt count, fallback details, error, and timestamp.
    """
    csv_content = delivery_manager.generate_csv_report(delivery_id)
    if not csv_content:
        raise HTTPException(status_code=404, detail="Delivery session not found or expired")

    return PlainTextResponse(
        content=csv_content,
        media_type="text/csv",
        headers={
            "Content-Disposition": f'attachment; filename="delivery_report_{delivery_id}.csv"'
        },
    )


# ── Legacy Single WhatsApp Send Endpoint ───────────────────────────────────

@app.post(
    "/api/whatsapp/send",
    response_model=SendCertificateResponse,
    tags=["WhatsApp"],
    summary="Legacy single WhatsApp send",
)
async def send_single_whatsapp(req: SendCertificateRequest) -> SendCertificateResponse:
    """Backward compatibility endpoint for single WhatsApp message delivery."""
    return await process_send_request(req)
