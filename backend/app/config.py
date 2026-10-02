"""
Certify Backend — Configuration
Loads all settings from environment variables (.env file).
"""

import os
from dotenv import load_dotenv

load_dotenv()


class Settings:
    # ── WhatsApp Business Cloud API ──────────────────────────────────────────
    WHATSAPP_ACCESS_TOKEN: str = os.getenv("WHATSAPP_ACCESS_TOKEN", "")
    WHATSAPP_PHONE_NUMBER_ID: str = os.getenv("WHATSAPP_PHONE_NUMBER_ID", "")
    WHATSAPP_BUSINESS_ACCOUNT_ID: str = os.getenv("WHATSAPP_BUSINESS_ACCOUNT_ID", "")
    WHATSAPP_API_VERSION: str = os.getenv("WHATSAPP_API_VERSION", "v19.0")

    # WhatsApp Message Template (must be pre-approved by Meta)
    CERTIFICATE_TEMPLATE_NAME: str = os.getenv("CERTIFICATE_TEMPLATE_NAME", "certificate_delivery")
    CERTIFICATE_TEMPLATE_LANGUAGE: str = os.getenv("CERTIFICATE_TEMPLATE_LANGUAGE", "en")

    # WhatsApp Test mode — when true, simulate delivery without calling Meta API
    WHATSAPP_TEST_MODE: bool = os.getenv("WHATSAPP_TEST_MODE", "true").lower() == "true"

    # ── Email (SMTP) ────────────────────────────────────────────────────────
    SMTP_HOST: str = os.getenv("SMTP_HOST", "")
    SMTP_PORT: int = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USERNAME: str = os.getenv("SMTP_USERNAME", "")
    SMTP_PASSWORD: str = os.getenv("SMTP_PASSWORD", "")
    SMTP_FROM_EMAIL: str = os.getenv("SMTP_FROM_EMAIL", "")
    SMTP_FROM_NAME: str = os.getenv("SMTP_FROM_NAME", "Certify")
    SMTP_USE_TLS: bool = os.getenv("SMTP_USE_TLS", "true").lower() == "true"

    # Email Test mode — when true, log without sending real emails
    EMAIL_TEST_MODE: bool = os.getenv("EMAIL_TEST_MODE", "true").lower() == "true"

    EMAIL_SUBJECT_TEMPLATE: str = os.getenv(
        "EMAIL_SUBJECT_TEMPLATE", "Your Certificate – {event_name}"
    )
    EMAIL_BODY_TEMPLATE: str = os.getenv(
        "EMAIL_BODY_TEMPLATE",
        "Dear {name},\n\nThank you for participating in {event_name}.\n\nPlease find your participation certificate attached.\n\nRegards,\n{from_name}",
    )

    # ── Delivery Queue & Rate Control ───────────────────────────────────────
    MAX_DELIVERY_RETRIES: int = int(os.getenv("MAX_DELIVERY_RETRIES", "3"))
    DELIVERY_CONCURRENCY: int = int(os.getenv("DELIVERY_CONCURRENCY", "1"))
    DELIVERY_DELAY_MS: int = int(os.getenv("DELIVERY_DELAY_MS", "500"))
    DELIVERY_SIMULATE_FAILURE_RATE: float = float(os.getenv("DELIVERY_SIMULATE_FAILURE_RATE", "0.0"))

    # File upload size limits (in MB)
    MAX_CERTIFICATE_SIZE_MB: int = int(os.getenv("MAX_CERTIFICATE_SIZE_MB", "10"))

    # ── Allowed CORS origins (comma-separated list) ──────────────────────────
    ALLOWED_ORIGINS: list[str] = [
        o.strip()
        for o in os.getenv(
            "ALLOWED_ORIGINS",
            "http://localhost:5173,http://127.0.0.1:5173,http://localhost:8000,http://localhost:3000,http://127.0.0.1:8000",
        ).split(",")
        if o.strip()
    ]

    @property
    def whatsapp_api_url(self) -> str:
        return (
            f"https://graph.facebook.com/{self.WHATSAPP_API_VERSION}"
            f"/{self.WHATSAPP_PHONE_NUMBER_ID}/messages"
        )

    @property
    def whatsapp_media_url(self) -> str:
        return (
            f"https://graph.facebook.com/{self.WHATSAPP_API_VERSION}"
            f"/{self.WHATSAPP_PHONE_NUMBER_ID}/media"
        )

    def validate_whatsapp(self) -> list[str]:
        """Return list of missing WhatsApp config keys."""
        missing = []
        if not self.WHATSAPP_ACCESS_TOKEN or "your_" in self.WHATSAPP_ACCESS_TOKEN:
            missing.append("WHATSAPP_ACCESS_TOKEN")
        if not self.WHATSAPP_PHONE_NUMBER_ID or "your_" in self.WHATSAPP_PHONE_NUMBER_ID:
            missing.append("WHATSAPP_PHONE_NUMBER_ID")
        return missing

    def validate_email(self) -> list[str]:
        """Return list of missing SMTP config keys."""
        missing = []
        if not self.SMTP_HOST:
            missing.append("SMTP_HOST")
        if not self.SMTP_FROM_EMAIL:
            missing.append("SMTP_FROM_EMAIL")
        return missing

    def validate(self) -> list[str]:
        """Legacy helper for WhatsApp validation."""
        return self.validate_whatsapp()


settings = Settings()
