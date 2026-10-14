# AQUORA AI — Predictive Water Safety & Risk Monitoring

[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688.svg)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/Frontend-React%20%2B%20Vite%20%2B%20TS-61DAFB.svg)](https://vitejs.dev/)
[![Tailwind CSS v4](https://img.shields.io/badge/Styling-Tailwind%20CSS%20v4-38B2AC.svg)](https://tailwindcss.com/)
[![scikit-learn](https://img.shields.io/badge/ML-scikit--learn-F7931E.svg)](https://scikit-learn.org/)
[![Database](https://img.shields.io/badge/DB-SQLite-003B57.svg)](https://sqlite.org/)

**AQUORA AI** is an intelligent water safety platform that assesses real-time environmental indicators (flow rate, water temperature, depth, rainfall, wind) to predict aquatic hazard levels, warn of hypothermia or rapid current risks, and provide actionable safety advisories for lakes, rivers, reservoirs, and coastal areas.

---

## 🧭 Project Architecture & Team Division

To facilitate smooth parallel progress across team members, the repository is split into three decoupled work streams:

| Role | Owner | Directory Scope | Core Deliverables |
| :--- | :--- | :--- | :--- |
| **Track 1: ML & Integration** | **Project Lead (You)** | `backend/app/ml/`, `data/`, Integration | Feature extraction, synthetic training pipeline, scikit-learn model, end-to-end testing |
| **Track 2: Frontend & Maps** | **Team Member 2** | `frontend/` | React + TypeScript UI, Tailwind v4 design system, Google Maps JS API visualization |
| **Track 3: Backend & Database**| **Team Member 3** | `backend/app/` (API, DB, ORM) | FastAPI routes, SQLite database schemas, SQLAlchemy models, Pydantic contracts |

For detailed architectural schematics, see [docs/architecture.md](file:///c:/Users/thott/Desktop/Aquora_AI/docs/architecture.md).  
For the exact API schemas, see [docs/api-contract.md](file:///c:/Users/thott/Desktop/Aquora_AI/docs/api-contract.md).

---

## 🛠 Tech Stack Decisions

1. **Frontend:** React 19 / 18 + Vite + TypeScript
2. **Styling:** Tailwind CSS v4 using the official `@tailwindcss/vite` integration
3. **Backend:** Python 3.11 + FastAPI + Pydantic v2
4. **Machine Learning:** Python + scikit-learn
5. **Database:** SQLite with SQLAlchemy ORM
6. **Mapping:** Google Maps JavaScript API
7. **AI Explanations (Optional):** Google Gemini API
8. **Version Control:** Git & GitHub

---

## 🚀 Quick Start Guide

### Prerequisites
- **Node.js:** v18+ (Tested on v22.14)
- **Python:** 3.10+ (Tested on 3.11.9)
- **Git**

---

### 1. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Create and activate Python virtual environment
python -m venv .venv

# Windows PowerShell:
.venv\Scripts\Activate.ps1
# (or Command Prompt: .venv\Scripts\activate.bat)

# Install backend dependencies
pip install -r requirements.txt

# Start the FastAPI development server
python run.py
```

The backend server will start at **`http://localhost:8000`**.  
Interactive OpenAPI documentation will be accessible at:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

---

### 2. Frontend Setup

```bash
# Navigate to frontend directory
cd frontend

# Install Node dependencies
npm install

# (Optional) Copy environment template and add your Google Maps API key
cp .env.example .env

# Start the Vite development server
npm run dev
```

The frontend application will start at **`http://localhost:5173`**.

---

## 📋 API Contract Summary

All endpoints conform strictly to the specifications documented in [docs/api-contract.md](file:///c:/Users/thott/Desktop/Aquora_AI/docs/api-contract.md):

- `GET  /api/v1/health` — Service health & subsystem status
- `GET  /api/v1/water-bodies` — Monitored water sites with coordinates and current risk
- `POST /api/v1/predict` — Dynamic hazard scoring based on environmental telemetry
- `GET  /api/v1/dashboard` — Aggregated telemetry and recent system alerts

---

## 🔒 Security & Data Ethics

- **No Secrets in Repositories:** Never commit `.env` or hardcode API credentials into frontend code or version control.
- **Data Integrity:** No real drowning incidents or unverified emergency reports are fabricated. Benchmark data is synthetic/simulated for hackathon prototype testing.
- **ML Transparency:** Models are explicitly tagged with their version and status (`is_baseline_model: true` until verified training is performed).
