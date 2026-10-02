"""
Verification script for Brevo backend functionality
"""

import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.config import settings
from app.main import app
from app.schemas import (
    DeliveryValidateRequest,
    ParticipantValidateItem,
    DeliveryStartRequest,
    DeliveryParticipant,
    CertificatePayload,
)
from app.services.email_service import send_certificate_email
from app.services.delivery_service import delivery_service
from app.utils.email_val import normalize_and_validate_email
from app.utils.retry import is_retryable_error


async def test_all():
    print("=== Test 1: Configuration ===")
    print(f"BREVO_TEST_MODE: {settings.BREVO_TEST_MODE}")
    print(f"is_configured: {settings.is_configured}")

    print("\n=== Test 2: Email Validation ===")
    val_good = normalize_and_validate_email("student@example.com")
    assert val_good["is_valid"] is True
    print("Valid email: OK")

    for bad in ["abc", "abc@", "@example.com", "", None]:
        val_bad = normalize_and_validate_email(bad)
        assert val_bad["is_valid"] is False
    print("Invalid emails (abc, abc@, @example.com, etc.): OK")

    print("\n=== Test 3: Error Classification & Retry Logic ===")
    assert is_retryable_error(429) is True
    assert is_retryable_error(500) is True
    assert is_retryable_error(502) is True
    assert is_retryable_error("TIMEOUT") is True
    assert is_retryable_error(400) is False
    assert is_retryable_error(401) is False
    assert is_retryable_error("INVALID_EMAIL") is False
    assert is_retryable_error("CONFIG_MISSING") is False
    print("Retry classification: OK")

    import base64
    valid_pdf_b64 = base64.b64encode(
        b"%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n"
        b"2 0 obj<</Type/Pages/Count 1/Kids[3 0 R]>>endobj\n"
        b"3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Resources<<>>>>endobj\n"
        b"xref\n0 4\n0000000000 65535 f\n0000000010 00000 n\n0000000053 00000 n\n0000000102 00000 n\n"
        b"trailer<</Size 4/Root 1 0 R>>\nstartxref\n178\n%%EOF\n"
    ).decode("ascii")

    print("\n=== Test 4: Brevo Email Delivery ===")
    res = await send_certificate_email(
        recipient_email="student@example.com",
        recipient_name="Naren Selvan",
        subject="Your Certificate",
        body="Congratulations!",
        pdf_base64=valid_pdf_b64,
        filename="Naren_Certificate.pdf",
    )
    assert res["success"] is True
    assert res["message_id"] is not None
    print(f"Email send successful: {res['message_id']} (test_mode={res['test_mode']})")

    print("\n=== Test 5: Delivery Preflight Validation ===")
    req = DeliveryValidateRequest(
        participants=[
            ParticipantValidateItem(index=0, name="Alice", email="alice@example.com"),
            ParticipantValidateItem(index=1, name="Bob", email="bad_email_bob"),
            ParticipantValidateItem(index=2, name="Charlie", email="charlie@example.com", certificate_size_bytes=25 * 1024 * 1024),
        ]
    )
    val_res = delivery_service.validate_batch(req)
    assert val_res.total == 3
    assert val_res.email_ready == 2
    assert val_res.email_invalid == 1
    assert val_res.certificates_ready == 2
    assert val_res.certificates_invalid == 1
    assert len(val_res.problems) == 2
    print(f"Preflight: {val_res.email_ready} valid emails, {val_res.email_invalid} invalid emails, {len(val_res.problems)} problems noted.")

    print("\n=== Test 6: In-Memory Bulk Delivery Session ===")
    participants = [
        DeliveryParticipant(
            id="p_1",
            sno="1",
            name="Indrish",
            email="ind@example.com",
            reg_no="727624bea001",
            event_name="Robotics Workshop",
            certificate=CertificatePayload(filename="Indrish.pdf", base64=valid_pdf_b64),
        ),
        DeliveryParticipant(
            id="p_2",
            sno="2",
            name="Selva Kumar",
            email="selva@example.com",
            reg_no="727624bea002",
            event_name="Robotics Workshop",
            certificate=CertificatePayload(filename="Selva.pdf", base64=valid_pdf_b64),
        ),
        DeliveryParticipant(
            id="p_3",
            sno="3",
            name="Invalid Participant",
            email="not-an-email",
            reg_no="727624bea003",
            event_name="Robotics Workshop",
            certificate=CertificatePayload(filename="Invalid.pdf", base64=valid_pdf_b64),
        ),
    ]

    delivery_id = delivery_service.start_delivery(participants)
    print(f"Started delivery session: {delivery_id}")

    # Wait for background queue to complete
    for _ in range(20):
        st = delivery_service.get_status(delivery_id)
        if st.is_complete:
            break
        await asyncio.sleep(0.5)

    print(f"Session Status: sent={st.sent}, skipped={st.skipped}, failed={st.failed}, complete={st.is_complete}")
    assert st.sent == 2
    assert st.skipped == 1
    assert st.is_complete is True

    results_res = delivery_service.get_results(delivery_id)
    assert len(results_res.results) == 3
    print(f"Results Breakdown: {results_res.summary}")

    csv_report = delivery_service.generate_csv_report(delivery_id)
    assert "Indrish" in csv_report
    assert "SENT" in csv_report
    assert "SKIPPED" in csv_report
    print("CSV Report generated successfully")

    print("\nALL TESTS PASSED SUCCESSFULLY!\n")


if __name__ == "__main__":
    asyncio.run(test_all())
