"""
Certify Backend — Configuration
Loads all settings from environment variables (.env file).
"""

import os
from dotenv import load_dotenv

load_dotenv()


class Settings:
    # WhatsApp Business Cloud API credentials
    WHATSAPP_ACCESS_TOKEN: str = os.getenv("WHATSAPP_ACCESS_TOKEN", "")
    WHATSAPP_PHONE_NUMBER_ID: str = os.getenv("WHATSAPP_PHONE_NUMBER_ID", "")
    WHATSAPP_BUSINESS_ACCOUNT_ID: str = os.getenv("WHATSAPP_BUSINESS_ACCOUNT_ID", "")
    WHATSAPP_API_VERSION: str = os.getenv("WHATSAPP_API_VERSION", "v19.0")

    # WhatsApp Message Template (must be pre-approved by Meta)
    CERTIFICATE_TEMPLATE_NAME: str = os.getenv("CERTIFICATE_TEMPLATE_NAME", "certificate_delivery")
    CERTIFICATE_TEMPLATE_LANGUAGE: str = os.getenv("CERTIFICATE_TEMPLATE_LANGUAGE", "en")

    # Test mode — when true, validate but never call WhatsApp API
    WHATSAPP_TEST_MODE: bool = os.getenv("WHATSAPP_TEST_MODE", "false").lower() == "true"

    # Allowed CORS origins (comma-separated list)
    ALLOWED_ORIGINS: list[str] = [
        o.strip()
        for o in os.getenv(
            "ALLOWED_ORIGINS",
            "http://localhost:8000,http://localhost:3000,http://127.0.0.1:8000"
        ).split(",")
        if o.strip()
    ]

    # File upload size limits
    MAX_CERTIFICATE_SIZE_MB: int = int(os.getenv("MAX_CERTIFICATE_SIZE_MB", "10"))

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

    def validate(self) -> list[str]:
        """Return list of missing required config keys."""
        missing = []
        if not self.WHATSAPP_ACCESS_TOKEN:
            missing.append("WHATSAPP_ACCESS_TOKEN")
        if not self.WHATSAPP_PHONE_NUMBER_ID:
            missing.append("WHATSAPP_PHONE_NUMBER_ID")
        return missing


settings = Settings()
