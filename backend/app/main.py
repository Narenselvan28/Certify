"""
Certify Backend — FastAPI Application Entry Point
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.schemas import SendCertificateRequest, SendCertificateResponse
from app.services.certificate_sender import process_send_request

# ── Logging ────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


# ── Lifespan ───────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    mode = "TEST MODE" if settings.WHATSAPP_TEST_MODE else "PRODUCTION"
    missing = settings.validate()
    if missing and not settings.WHATSAPP_TEST_MODE:
        logger.warning(
            "⚠ Missing WhatsApp credentials: %s — delivery will fail until configured.",
            ", ".join(missing),
        )
    logger.info("🚀 Certify Backend starting [%s]", mode)
    yield
    logger.info("Certify Backend shutting down.")


# ── App ────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="Certify Backend",
    description="Stateless backend for bulk WhatsApp certificate delivery.",
    version="1.0.0",
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
    logger.exception("Unhandled exception on %s %s", request.method, request.url.path)
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
        "test_mode": settings.WHATSAPP_TEST_MODE,
        "api_version": settings.WHATSAPP_API_VERSION,
    }


# ── WhatsApp API ───────────────────────────────────────────────────────────
@app.post(
    "/api/whatsapp/send",
    response_model=SendCertificateResponse,
    tags=["WhatsApp"],
    summary="Send a single certificate via WhatsApp",
)
async def send_certificate(req: SendCertificateRequest) -> SendCertificateResponse:
    """
    Receive a certificate (base64 PDF) and participant details,
    deliver it via WhatsApp Business Cloud API, and return the result.

    **No participant data or certificate is stored by this endpoint.**
    All processing is in-memory and discarded after the response.
    """
    logger.info(
        "Received send request for phone=+%s name=%r event=%r file=%s",
        req.phone, req.name, req.event_name, req.certificate.filename,
    )
    return await process_send_request(req)
