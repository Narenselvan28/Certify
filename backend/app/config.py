"""
Certify Backend — Configuration
Loads settings for Brevo Transactional Email delivery from .env.
"""

import os
from dotenv import load_dotenv

load_dotenv()


class Settings:
    # ── Brevo Transactional Email API ──────────────────────────────────────────
    BREVO_API_KEY: str = os.getenv("BREVO_API_KEY", "")
    BREVO_SENDER_EMAIL: str = os.getenv("BREVO_SENDER_EMAIL", "")
    BREVO_SENDER_NAME: str = os.getenv("BREVO_SENDER_NAME", "Certify")

    # When true, simulates delivery pipeline without dispatching real emails
    BREVO_TEST_MODE: bool = os.getenv("BREVO_TEST_MODE", "true").lower() == "true"

    # Delivery & retry parameters
    MAX_EMAIL_RETRIES: int = int(os.getenv("MAX_EMAIL_RETRIES", "3"))
    EMAIL_SEND_DELAY_MS: int = int(os.getenv("EMAIL_SEND_DELAY_MS", "100"))
    EMAIL_BATCH_SIZE: int = int(os.getenv("EMAIL_BATCH_SIZE", "50"))

    # File upload / attachment size limit (in MB)
    MAX_CERTIFICATE_SIZE_MB: int = int(os.getenv("MAX_CERTIFICATE_SIZE_MB", "10"))

    # Default Email Templates
    EMAIL_SUBJECT_TEMPLATE: str = os.getenv(
        "EMAIL_SUBJECT_TEMPLATE", "Your Certificate – {event_name}"
    )
    EMAIL_BODY_TEMPLATE: str = os.getenv(
        "EMAIL_BODY_TEMPLATE",
        "Dear {name},\n\nThank you for participating in {event_name}.\n\nPlease find your certificate attached to this email.\n\nWe appreciate your participation and congratulate you on your achievement.\n\nRegards,\n{organization}",
    )

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
    def is_configured(self) -> bool:
        """Return True if Brevo API key and sender email are configured."""
        return bool(
            self.BREVO_API_KEY
            and "your_" not in self.BREVO_API_KEY.lower()
            and self.BREVO_SENDER_EMAIL
            and "@" in self.BREVO_SENDER_EMAIL
        )


settings = Settings()
