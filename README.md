# Certify — Bulk Certificate Generator & Brevo Email Delivery

Certify is a modern certificate generation and bulk email delivery application. It pairs an in-browser visual certificate designer and bulk PDF renderer with a lightweight FastAPI backend for transactional email delivery via **Brevo**.

```text
React Frontend
      ↓
FastAPI Backend
      ↓
Brevo Transactional Email
      ↓
Participant Email
      ↓
Certificate PDF
```

---

## Architecture

* **Frontend**: React + Vite (Tailwind CSS, SheetJS, jsPDF, html2canvas)
* **Backend**: FastAPI (Python 3.11+, `httpx`)
* **Email Provider**: Brevo Transactional Email REST API
* **Client Storage**: Browser session & IndexedDB for offline template persistence
* **Database**: **None** (Stateless in-memory sessions)

---

## Features

* **Visual Certificate Editor**:
  * Drag-and-drop template upload (PNG, JPG, WEBP up to 4K).
  * Field positioning, 8-point resizing, rotation, font selection, alignment, color picker.
  * Auto-fit text bounding boxes and multi-level Undo/Redo.
* **Excel / CSV Import & Auto-Mapping**:
  * Fuzzy auto-mapping of fields: Name, Reg No, Department, Event Name, and Email.
  * Automatic detection of email columns (`Email`, `Email Address`, `E-mail`, `Mail`, `Mail ID`).
* **Certificate Preview & Export**:
  * High-fidelity single certificate preview and responsive grid view.
  * Instant single PDF download.
  * Combined multi-page PDF generation.
  * Bulk ZIP export fallback.
* **Brevo Email Delivery Center**:
  * Preflight validation of recipient emails and PDF attachment sizes.
  * Controlled rate-limited delivery queue.
  * Real-time progress bar with active recipient details.
  * Exponential backoff retry for transient errors (HTTP 429, 500, timeouts).
  * Detailed results view with single-click retry for failed deliveries.
  * Downloadable CSV delivery report.
  * Admin single test email verification.
  * Safe simulation test mode (`BREVO_TEST_MODE=true`).

---

## Setup & Getting Started

### Step 1: Create a Brevo Account
Sign up for a free account at [Brevo (formerly Sendinblue)](https://www.brevo.com/).

### Step 2: Verify Sender or Domain
In the Brevo Dashboard, navigate to **Senders, Domains & Dedicated IPs** and add/verify your sender email address (e.g. `certificates@example.com`).

### Step 3: Generate a Brevo API Key
Navigate to **SMTP & API** → **API Keys** in Brevo and generate a new API key.

### Step 4: Create Backend Environment File
In the `backend/` directory, copy `.env.example` to `.env`:

```bash
cd backend
cp .env.example .env
```

### Step 5: Configure Brevo Credentials
Edit `backend/.env`:

```env
BREVO_API_KEY=xkeysib-your-actual-api-key-here
BREVO_SENDER_EMAIL=certificates@example.com
BREVO_SENDER_NAME=Certify
BREVO_TEST_MODE=true

MAX_EMAIL_RETRIES=3
EMAIL_SEND_DELAY_MS=100
EMAIL_BATCH_SIZE=50

MAX_CERTIFICATE_SIZE_MB=10
ALLOWED_ORIGINS=http://localhost:5173
```

> **Security Note:** The API key exists strictly backend-only in `backend/.env`. It is never exposed to the React frontend, browser storage, or Git repository.

### Step 6: Start FastAPI Backend

```bash
cd backend
python -m venv .venv
# On Windows:
.venv\Scripts\activate
# On Linux/macOS:
source .venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --reload --port 8001
```

### Step 7: Start React Frontend

In a separate terminal:

```bash
cd frontend
npm install
npm run dev
```

Open your browser to `http://localhost:5173`.

### Step 8: Use the Test Email Feature
In the application, proceed to the **Delivery Center** and click **Send Test Email** to send a single sample certificate to your email address and verify connectivity.

### Step 9: Test with a Small Participant List
Upload an Excel file with 2–5 participant records, map the columns, generate certificates, and run delivery in Test Mode (`BREVO_TEST_MODE=true`). Check the progress bar and downloadable report.

### Step 10: Switch to Production
When ready to deliver real certificates to participants, set in `backend/.env`:

```env
BREVO_TEST_MODE=false
```

Restart FastAPI, and proceed to send real certificates!

---

## Recommended Excel Format

| S.No | Name | Reg No | Department | Email |
| :--- | :--- | :--- | :--- | :--- |
| 1 | Indrish | 727624bea001 | ECE | ind@example.com |
| 2 | Selva Kumar | 727624bea002 | ECE | selva@example.com |
| 3 | Naren Selvan T | 727624bea005 | ECE | naren@example.com |

---

## Verification & Testing

To run the automated backend test suite:

```bash
cd backend
.venv\Scripts\python.exe tests\verify_brevo.py
```

Tests cover:
* Configuration & security isolation
* Email normalization & regex validation
* HTTP / Brevo error classification (429, 500, timeouts)
* Brevo transactional email simulation
* Bulk delivery queue, progress polling, and CSV reporting

---

## License

MIT License.
