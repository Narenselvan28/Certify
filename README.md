# Certify — Bulk Certificate Generator & Multi-Channel Delivery Platform

**Certify** is a modern certificate generation and automated multi-channel delivery platform. It pairs a **100% client-side React visual certificate designer** with a **stateless FastAPI delivery queue backend** supporting official **Meta WhatsApp Cloud API**, **SMTP Email delivery**, and **ZIP export fallback**.

---

## 🌟 Key Architecture & Capabilities

```text
                    CERTIFY
                       │
                Generate Certificates
                       │
                       ▼
                 Delivery Center
                       │
          ┌────────────┼────────────┐
          │            │            │
          ▼            ▼            ▼
      WhatsApp       Email      ZIP Download
          │            │            │
          └────────────┼────────────┘
                       ▼
                Delivery Queue
          (Rate control · Concurrency)
                       │
                       ▼
            Retry & Transient Recovery
          (429 · Timeouts · Backoff)
                       │
                       ▼
               Final CSV Report
```

### Frontend (React.js + Tailwind CSS)
* **Visual Certificate Editor**: Drag, 8-point resize handles, and 360° rotation with angle snapping.
* **Smart Auto-Fit**: Dynamically scales typography when participant names overflow.
* **Curated Typography**: 27 categorized Google Fonts (Sans-serif, Serif, Display, Handwriting).
* **Excel / CSV Import**: SheetJS parser with automatic fuzzy column detection for `Name`, `Reg No`, `Department`, `WhatsApp Phone`, and `Email`.
* **Previews**: Interactive Single Preview carousel and thumbnail Grid View.
* **Persistent Session**: Auto-saved to `localStorage` and `IndexedDB`—refreshing never loses your work.

### Backend (Python FastAPI)
* **No Database**: Stateless in-memory queue. No credentials, recipient data, or certificates are stored permanently.
* **Multi-Channel Delivery**:
  * **WhatsApp**: Official Meta WhatsApp Business Cloud API with temporary in-memory media upload.
  * **Email**: SMTP dispatch with TLS/SSL, customizable subject/body, and PDF attachment.
  * **Fallback**: Automatic fallback to Email when a participant's WhatsApp delivery fails.
* **Controlled Concurrency & Rate Limiting**: Inter-job delays (`DELIVERY_DELAY_MS`) and dynamic 429 backoff.
* **Smart Retry System**: Exponential backoff for transient network errors and rate limits; permanent failures (invalid numbers/emails) are never endlessly retried.
* **Auditing & Reporting**: Generates a downloadable CSV report for every delivery run.

---

## 🚀 Quick Start Guide

### Prerequisites
* **Node.js** (v18+)
* **Python** (v3.10+)

### 1. Start the FastAPI Backend
```powershell
cd backend
python -m venv .venv
.venv\Scripts\activate       # On Linux/macOS: source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --port 8001
```
* Backend health check: [http://localhost:8001/health](http://localhost:8001/health)
* Interactive Swagger documentation: [http://localhost:8001/docs](http://localhost:8001/docs)

### 2. Start the React Frontend
In a second terminal:
```powershell
cd frontend
npm install
npm run dev
```
* Web application: [http://localhost:5173](http://localhost:5173)

---

## ⚙️ Configuration & Environment Variables

Create a `.env` file in the `backend/` directory by copying `.env.example`:

```env
# ===============================
# 1. WHATSAPP CLOUD API
# ===============================
WHATSAPP_ACCESS_TOKEN=your_meta_system_user_token
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
WHATSAPP_BUSINESS_ACCOUNT_ID=your_waba_id
WHATSAPP_API_VERSION=v19.0
CERTIFICATE_TEMPLATE_NAME=certificate_delivery
CERTIFICATE_TEMPLATE_LANGUAGE=en

# Set to true for local testing without calling Meta API:
WHATSAPP_TEST_MODE=true

# ===============================
# 2. EMAIL (SMTP)
# ===============================
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your_email@gmail.com
SMTP_PASSWORD=your_app_password
SMTP_FROM_EMAIL=your_email@gmail.com
SMTP_FROM_NAME=Certify
SMTP_USE_TLS=true

# Set to true for local testing without sending actual emails:
EMAIL_TEST_MODE=true

# ===============================
# 3. DELIVERY QUEUE
# ===============================
MAX_DELIVERY_RETRIES=3
DELIVERY_CONCURRENCY=1
DELIVERY_DELAY_MS=500
DELIVERY_SIMULATE_FAILURE_RATE=0.0
MAX_CERTIFICATE_SIZE_MB=10

# ===============================
# 4. CORS
# ===============================
ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
```

---

## 📱 Meta WhatsApp Setup

1. Log into [Meta for Developers](https://developers.facebook.com/) and create a **Business** application.
2. Add the **WhatsApp** product.
3. Under **API Setup**, retrieve your:
   * **Temporary access token** (or create a permanent System User Token under Business Settings > System Users).
   * **Phone number ID**.
4. In development mode with Meta test numbers, add recipient phone numbers to the **"To" list** under **Manage phone number list**.
5. Set `WHATSAPP_TEST_MODE=false` in `backend/.env` to send live WhatsApp messages.

---

## 📧 SMTP Email Setup

Certify works with any standard SMTP provider:
* **Gmail**: Set `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=587`, `SMTP_USE_TLS=true`. Generate a 16-character **App Password** under Google Account > Security > 2-Step Verification > App passwords.
* **Institutional / College SMTP**: Set `SMTP_HOST` to your university's mail relay host.
* **Transactional Email**: Compatible with AWS SES (`email-smtp.*.amazonaws.com`), SendGrid (`smtp.sendgrid.net`), or Mailgun.
* Set `EMAIL_TEST_MODE=false` in `backend/.env` to dispatch live emails.

---

## 🧪 Testing

Run backend unit and integration tests:
```powershell
cd backend
.venv\Scripts\activate
python tests/test_delivery.py
```

Test coverage includes:
* Indian phone normalization (`9092957457`, `09092957457`, `+919092957457` → `919092957457`) & international E.164.
* Email syntax and domain normalization.
* Retry classification (429, timeouts, 500s vs permanent invalid contacts).
* Preflight validation, queue orchestration, fallback delivery, and CSV report streaming.

---

## 🔒 Security Principles

* **No Credentials in Frontend**: Tokens and passwords exist strictly in `backend/.env`.
* **Zero Database Exposure**: Certificates and participant rosters are processed in memory and never persisted on server disks.
* **Official APIs Only**: Strictly uses official Meta Cloud API and standard SMTP protocols. No browser automation or scraping.
