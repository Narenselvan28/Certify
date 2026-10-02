"""
Unit and integration tests for Certify Multi-Channel Delivery
"""

import asyncio
import os
import sys

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.utils.phone import normalize_and_validate_phone
from app.utils.email_val import normalize_and_validate_email
from app.utils.retry import is_retryable_error, get_retry_delay
from app.services.delivery_manager import delivery_manager
from app.schemas import (
    DeliveryValidateRequest,
    ParticipantValidateItem,
    DeliveryParticipant,
    CertificatePayload,
)


def test_phone_validation():
    # Indian 10 digits
    res1 = normalize_and_validate_phone("9092957457")
    assert res1["is_valid"] and res1["normalized"] == "919092957457", f"Failed: {res1}"

    # Indian with +91
    res2 = normalize_and_validate_phone("+919092957457")
    assert res2["is_valid"] and res2["normalized"] == "919092957457", f"Failed: {res2}"

    # Indian with 91 prefix
    res3 = normalize_and_validate_phone("919092957457")
    assert res3["is_valid"] and res3["normalized"] == "919092957457", f"Failed: {res3}"

    # Indian with 0 prefix
    res4 = normalize_and_validate_phone("09092957457")
    assert res4["is_valid"] and res4["normalized"] == "919092957457", f"Failed: {res4}"

    # Invalid digits
    res5 = normalize_and_validate_phone("12345")
    assert not res5["is_valid"], f"Should fail: {res5}"

    # Empty
    res6 = normalize_and_validate_phone("")
    assert not res6["is_valid"], f"Should fail: {res6}"

    print("[OK] Phone validation tests passed")


def test_email_validation():
    res1 = normalize_and_validate_email("student@example.com")
    assert res1["is_valid"] and res1["normalized"] == "student@example.com", f"Failed: {res1}"

    res2 = normalize_and_validate_email("STUDENT.CSE@COLLEGE.EDU.IN")
    assert res2["is_valid"] and res2["normalized"] == "STUDENT.CSE@college.edu.in", f"Failed: {res2}"

    res3 = normalize_and_validate_email("invalid-email")
    assert not res3["is_valid"], f"Should fail: {res3}"

    res4 = normalize_and_validate_email("")
    assert not res4["is_valid"], f"Should fail: {res4}"

    print("[OK] Email validation tests passed")


def test_retry_classification():
    # Retryable errors
    assert is_retryable_error("429"), "429 must be retryable"
    assert is_retryable_error("500"), "500 must be retryable"
    assert is_retryable_error(None, "Connection timed out"), "Timeout must be retryable"
    assert is_retryable_error("130429"), "WhatsApp 130429 rate limit must be retryable"

    # Permanent errors
    assert not is_retryable_error("INVALID_PHONE"), "Invalid phone must not be retryable"
    assert not is_retryable_error("INVALID_EMAIL"), "Invalid email must not be retryable"
    assert not is_retryable_error("131026"), "WhatsApp 131026 invalid recipient must not be retryable"
    assert not is_retryable_error(None, "Authentication failed"), "Auth failure must not be retryable"

    # Backoff calculation
    assert get_retry_delay(1) == 1.0
    assert get_retry_delay(2) == 2.0
    assert get_retry_delay(3) == 4.0

    print("[OK] Retry classification tests passed")


async def test_delivery_queue_workflow():
    # 1. Preflight Validation
    val_req = DeliveryValidateRequest(
        participants=[
            ParticipantValidateItem(index=1, name="Aarav", phone="919876543210", email="aarav@example.com"),
            ParticipantValidateItem(index=2, name="Bad Phone", phone="123", email="badphone@example.com"),
            ParticipantValidateItem(index=3, name="Bad Email", phone="919876543212", email="not-an-email"),
        ],
        channels=["whatsapp", "email"],
    )
    val_res = delivery_manager.validate_batch(val_req)
    assert val_res.whatsapp_ready == 2, f"Expected 2 wa_ready, got {val_res.whatsapp_ready}"
    assert val_res.whatsapp_invalid == 1, f"Expected 1 wa_invalid, got {val_res.whatsapp_invalid}"
    assert val_res.email_ready == 2, f"Expected 2 em_ready, got {val_res.email_ready}"
    assert val_res.email_invalid == 1, f"Expected 1 em_invalid, got {val_res.email_invalid}"
    print("[OK] Delivery validation tests passed")

    # 2. Start Bulk Delivery (in test mode)
    participants = [
        DeliveryParticipant(
            id="p1",
            sno="1",
            name="Indrish",
            phone="919092957457",
            email="indrish@example.com",
            event_name="SPECTRUM 2026",
            certificate=CertificatePayload(filename="cert_indrish.pdf", base64="JVBERi0xLjQK"),
        ),
        DeliveryParticipant(
            id="p2",
            sno="2",
            name="Naren",
            phone="919384438928",
            email="naren@example.com",
            event_name="SPECTRUM 2026",
            certificate=CertificatePayload(filename="cert_naren.pdf", base64="JVBERi0xLjQK"),
        ),
    ]

    delivery_id = delivery_manager.start_delivery(
        participants=participants,
        channels=["whatsapp", "email"],
        enable_fallback=True,
    )
    assert delivery_id is not None, "delivery_id was None"

    # Poll status until complete
    for _ in range(30):
        st = delivery_manager.get_status(delivery_id)
        assert st is not None
        if st.is_complete:
            break
        await asyncio.sleep(0.1)

    st = delivery_manager.get_status(delivery_id)
    assert st.is_complete, f"Queue did not complete in time: {st}"
    assert st.sent == 2, f"Expected 2 sent, got {st.sent}"

    # Results
    res = delivery_manager.get_results(delivery_id)
    assert res is not None
    assert len(res.results) == 2
    assert res.summary.sent == 2

    # CSV Report
    csv_report = delivery_manager.generate_csv_report(delivery_id)
    assert "Indrish" in csv_report
    assert "Naren" in csv_report
    assert "SENT" in csv_report

    print("[OK] Full delivery queue workflow test passed")


async def main():
    test_phone_validation()
    test_email_validation()
    test_retry_classification()
    await test_delivery_queue_workflow()
    print("\nALL BACKEND DELIVERY TESTS PASSED SUCCESSFULLY!")


if __name__ == "__main__":
    asyncio.run(main())
