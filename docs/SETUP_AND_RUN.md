# AQUORA AI — Setup & Local Execution Guide

**Environment:** Windows / macOS / Linux  
**Runtime Requirements:** Python 3.11+, Node.js 18+, npm 9+, Git

---

## 1. Quick Start Commands

### Step 1: Clone and Inspect Working Branch
```bash
git clone https://github.com/vaishnavtt/Aquora_AI.git
cd Aquora_AI
git status
```

### Step 2: Backend Setup & Database Initialization
From the repository root:
```bash
# Navigate to backend directory
cd backend

# Create and activate Python virtual environment
python -m venv .venv

# Windows PowerShell:
.venv\Scripts\Activate.ps1
# Linux / macOS:
# source .venv/bin/activate

# Install required dependencies
pip install --upgrade pip
pip install -r requirements.txt

# Apply Alembic database migrations to head revision
alembic upgrade head

# Ingest initial benchmark waterbody dataset
python -m app.db.init_db
```

### Step 3: Run Backend Test Suite
```bash
# Run the complete test suite (225 tests)
pytest -v

# Run targeted test suites
pytest -v tests/test_inspections.py
pytest -v tests/test_migrations.py
pytest -v tests/test_water_level_forecaster.py
```

### Step 4: Start Backend Dev Server
```bash
# Launch FastAPI server with auto-reload
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
The interactive Swagger API documentation is available at:
`http://localhost:8000/docs`

---

## 2. Frontend Setup & Execution

Open a separate terminal window:
```bash
# Navigate to frontend directory
cd frontend

# Install node dependencies
npm install

# Run frontend Vitest test suite (79 tests)
npm test

# Run frontend production build
npm run build

# Start Vite development server
npm run dev
```
The web application is accessible at:
`http://localhost:5173`

---

## 3. Environment Variables Configuration

Create a `.env` file in `backend/` or configure the following environment variables:

| Variable Name | Default Value | Purpose |
|:---|:---|:---|
| `DATABASE_URL` | `sqlite:///./aquora.db` | SQLite connection string |
| `API_V1_PREFIX` | `/api/v1` | Base route prefix |
| `ALERT_WEBHOOK_URL` | *(Empty)* | Outbound webhook endpoint for HTTP POST dispatches |
| `SMTP_HOST` | *(Empty)* | SMTP mail server hostname |
| `SMTP_PORT` | `587` | SMTP port |
| `SMTP_USER` | *(Empty)* | SMTP authentication user |
| `SMTP_PASSWORD` | *(Empty)* | SMTP authentication password |
| `TWILIO_ACCOUNT_SID`| *(Empty)* | Twilio account SID for SMS delivery |
| `TWILIO_AUTH_TOKEN` | *(Empty)* | Twilio auth token |
| `TWILIO_FROM_NUMBER`| *(Empty)* | Twilio verified sender phone number |

> [!NOTE]
> **Safe Unconfigured Behavior:**
> External credentials (SMTP, Twilio) are completely optional for local development. When credentials are not supplied, the alerting subsystem automatically falls back to safe simulation mode (`is_test_mode = True`, `TEST_MODE_SIMULATED`) and logs dispatches to the SQLite database without crashing.

---

## 4. Database Migration Management

Alembic tracks schema revisions in `backend/alembic/versions/`:

```bash
# Check current migration revision
alembic current

# Check for unmigrated schema drift
alembic check

# Revert migration to baseline
alembic downgrade dfd0da3e179f

# Re-upgrade to latest head
alembic upgrade head
```
