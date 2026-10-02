# Certify Backend — Brevo Email Delivery Service

Stateless, lightweight FastAPI backend for bulk certificate delivery using Brevo Transactional Email REST API.

## Features

- **Direct Brevo REST API**: Uses `httpx` directly without unnecessary heavy SDK layers.
- **In-Memory Delivery Queue**: Controlled sequential rate-limited delivery with zero database dependency.
- **Smart Retries**: Automatic exponential backoff for transient failures (HTTP 429, 500, 502, 503, 504, timeouts). Never retries permanent errors (invalid email syntax, missing credentials, bad payload).
- **Test Mode**: `BREVO_TEST_MODE=true` simulates sending and validates the entire pipeline safely.
- **Test Email Endpoint**: Quick verification of Brevo configuration via `POST /api/email/test`.
- **Preflight Validation**: Validates email syntax and attachment size limits before dispatching.
- **Downloadable CSV Report**: Generates timestamped delivery logs.

## Setup & Installation

### 1. Configure Python Environment

```bash
cd backend
python -m venv .venv
# Windows:
.venv\Scripts\activate
# Linux/macOS:
source .venv/bin/activate

pip install -r requirements.txt
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Configure your Brevo settings in `.env`:

```env
BREVO_API_KEY=your_brevo_api_key_here
BREVO_SENDER_EMAIL=certificates@example.com
BREVO_SENDER_NAME=Certify

BREVO_TEST_MODE=true

MAX_EMAIL_RETRIES=3
EMAIL_SEND_DELAY_MS=100
EMAIL_BATCH_SIZE=50

MAX_CERTIFICATE_SIZE_MB=10
ALLOWED_ORIGINS=http://localhost:5173
```

### 3. Start the Server

```bash
uvicorn app.main:app --reload --port 8001
```

The API will be available at `http://localhost:8001`.
Interactive Swagger documentation is available at `http://localhost:8001/docs`.

## API Endpoints

- `GET /health` — Health check
- `GET /api/email/status` — Brevo configuration status (secrets never exposed)
- `POST /api/email/test` — Send a single test email
- `POST /api/delivery/validate` — Preflight email & certificate validation
- `POST /api/delivery/start` — Start bulk delivery session
- `GET /api/delivery/{delivery_id}/status` — Real-time progress polling
- `GET /api/delivery/{delivery_id}/results` — Detailed per-participant results
- `POST /api/delivery/{delivery_id}/retry` — Retry temporary failed jobs
- `GET /api/delivery/{delivery_id}/report` — Download CSV delivery report
