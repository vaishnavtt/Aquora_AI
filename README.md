# AQUORA AI — Predictive Water Safety & Hydrological Monitoring

[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688.svg)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/Frontend-React%20%2B%20Vite%20%2B%20TS-61DAFB.svg)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Styling-Tailwind%20CSS-38B2AC.svg)](https://tailwindcss.com/)
[![scikit-learn](https://img.shields.io/badge/ML-scikit--learn-F7931E.svg)](https://scikit-learn.org/)
[![Database](https://img.shields.io/badge/DB-SQLite-003B57.svg)](https://sqlite.org/)
[![Tests](https://img.shields.io/badge/Tests-79%20Passing-brightgreen.svg)](https://pytest.org/)

**AQUORA AI** is an intelligent aquatic hazard monitoring and river water-level forecasting platform. It evaluates multi-variable environmental indicators (flow rate, water temperature, depth, rainfall, wind velocity) to calculate aquatic hazard scores, warn of hypothermia and hydrodynamic suction risks, and provide actionable safety advisories.

The system incorporates authentic hydrodynamic machine learning forecasting trained on real river data, live USGS sensor feeds, historical government archives, and verifiable emergency dispatching with strict data ethics guardrails.

---

## 🌟 Implemented System Features

### 1. Selectable Water-Body Locations & Geographic Grounding
- **Database-Backed Records:** Interactive Leaflet map with satellite imagery allowing users to select monitored water bodies (rivers, lakes, reservoirs, bays).
- **Geographic Attributes:** Each station persists and surfaces verified coordinates, elevation in meters above Mean Sea Level (`elevation_meters`), river basin (`basin_region`), and data source provenance.
- **Unsupported Coordinate Protection:** Map clicks on unmonitored coordinates query the backend (`GET /api/v1/water-bodies/by-coordinates`) and display a clear, amber data-availability advisory. The system strictly **never fabricates environmental observations** for unsupported locations.

### 2. Environmental Data Pipeline Audit (6 Dimensions)
A dedicated endpoint (`GET /api/v1/environmental-data/{id}`) audits every environmental dimension with explicit status indicators:
1. **Rainfall:** Assessed via local weather stations or explicitly marked as unavailable when dedicated raingauges are absent.
2. **Water-Level Observations:** Authentic stage readings with timestamps and source agency metadata.
3. **Water-Body Type:** Classification (River, Lake, Reservoir, Coastal Bay) retrieved from SQLite.
4. **Terrain & Elevation:** Monitored station elevation in meters MSL and basin topography.
5. **Historical Hazard / Drowning Records:** Explicitly marked as **UNAVAILABLE** (no official district incident registry exists). The system never fabricates drowning casualty statistics.
6. **Observation Timestamps & Metadata:** ISO 8601 timestamps and originating agency tags accompany every reading.

### 3. Environmental Risk Engine (`baseline-heuristic-v0.1`)
- **Nature of the Risk Engine:** The environmental risk predictor (`AquaticRiskPredictor`) is a **deterministic, explainable domain heuristic**, *not* a machine-learned drowning classifier.
- **Physical Factors:** Dynamically calculates risk scores based on physical parameters:
  - Water temperature ($T < 10^\circ\text{C}$ triggers severe cold shock warning; $T < 15^\circ\text{C}$ triggers moderate hypothermia caution).
  - Current velocity ($Q \ge 12.0\text{ m}^3\text{/s}$ triggers critical current restriction; $Q \ge 6.0\text{ m}^3\text{/s}$ triggers rapid current caution).
  - Rainfall runoff ($\ge 50\text{ mm}$ triggers flash flood runoff warning).
  - High gale winds ($\ge 45\text{ km/h}$).
- **Consistency:** Risk categories (`low`, `moderate`, `high`, `extreme`) are standardized across backend schemas, frontend cards, and map markers.
- **Transparency:** The system explicitly states that scores represent **environmental aquatic hazard**, not calibrated human drowning probabilities.

### 4. Ridge-Based River Stage Forecaster (Trained ML Model)
- **Trained Artifact:** `ramamangalam_water_level_model.joblib` (scikit-learn Ridge regression).
- **Training Dataset:** 29,864 hourly stage and discharge observations from **Ramamangalam Bridge** (Kerala SW / CWC) on the Muvattupuzha River basin.
- **Feature Engineering:** Computes 25 kinematic and hydrodynamic momentum features across a 13-hour sliding lag window ($t-12$ to $t$).
- **Benchmark Performance:**
  - Test Set Mean Absolute Error (MAE): **10.8 mm (1.08 cm)**.
  - Naive Persistence Benchmark ($wl_{t+1} = wl_t$): **17.0 mm (1.70 cm)**.
  - Error Reduction: **36.7% error reduction** over naive persistence baseline.
- **Ground-Truth Evaluation:** Dedicated endpoint (`GET /api/v1/river-data/forecast-vs-observation/{station}`) compares sequential model forecasts against real subsequent observations ($wl_{t+1}$) with outperformance indicators.

### 5. Automated Hazard Monitoring Service (`HazardMonitoringService`)
- **Dynamic Threshold Surveillance:**
  - Stage Surge Threshold: $\Delta h \ge +0.15\text{ m}$ (+15 cm / hour).
  - Flow Breach Threshold: Discharge $Q \ge 6.00\text{ m}^3\text{/s}$.
  - High Hazard Score Threshold: Environmental risk score $\ge 60.0$.
- **Background Scheduler:** Thread-safe scheduler running a periodic background sweep with configurable cycle (default 60 seconds).
- **Deduplication:** 60-second in-memory suppression window prevents alert storms for continuous breach conditions.
- **Safe Test Simulation Mode:** When enabled, dispatches are marked as `TEST_MODE_SIMULATED` to prevent unsolicited external notifications during testing.
- **Durable Persistence:** Every generated warning and audit trail is persisted in the SQLite database (`AlertModel` and `AlertDeliveryModel`).

### 6. Live Telemetry & Historical Archives
- **USGS NWIS Live Stream:** Real-time water-level telemetry integrated from USGS station **11164500 (San Francisquito Creek at Stanford, CA)** via `https://waterservices.usgs.gov/nwis/iv/`. Kept associated with its authentic US geographic coordinates.
- **Kerala SW Archive:** Authentic historical stage records for Ramamangalam Bridge.
- **NWIC Provider Integration:** Clearly marked as **UNAVAILABLE** when authorized credentials are not present in `.env`. The system never synthesizes fake live Indian telemetry.

### 7. Emergency Alert Delivery Infrastructure
- **Channels:** Outbound notifications via **Webhook** (JSON POST) and **SMTP Email** (HTML advisory).
- **Status Distinctions:**
  - `TEST_MODE_SIMULATED`: Safely validated and recorded without external network calls.
  - `ACCEPTED`: Provider acknowledged receipt (e.g., SMTP server accepted message for queueing).
  - `DELIVERED`: Confirmed external delivery where supported.
  - `FAILED`: Explicit network, authentication, or DNS failure logged with root cause.
  - `DUPLICATE_SUPPRESSED`: Suppressed by the deduplication window.

---

## 🛠 Tech Stack

- **Backend:** Python 3.11, FastAPI, Pydantic v2, SQLAlchemy, Uvicorn, scikit-learn, joblib.
- **Database:** SQLite with dynamic column migration.
- **Frontend:** React 19 / 18, Vite, TypeScript, Tailwind CSS, Lucide React, Leaflet with Esri World Imagery.
- **Testing:** Pytest with 79 passing test cases.

---

## ⚙️ Environment Configuration

Create a `.env` file in the project root or in `backend/` (or copy `.env.example`):

```bash
# ==============================================================================
# AQUORA AI — BACKEND CONFIGURATION
# ==============================================================================

# Core Application Settings
BACKEND_HOST=127.0.0.1
BACKEND_PORT=8000

# SQLite Database URL - defaults to local backend/aquora.db
DATABASE_URL=sqlite:///./backend/aquora.db

# Outbound Alerting Infrastructure (Safe Mode by Default)
ALERT_TEST_MODE=true

# Webhook Alerting (Optional - e.g., Webhook.site, Discord, Slack)
ALERT_WEBHOOK_URL=https://webhook.site/your-unique-test-token
ALERT_WEBHOOK_AUTH_TOKEN=your_optional_bearer_token

# SMTP Email Dispatching (Optional - for real email alerts)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USERNAME=your_smtp_username
SMTP_PASSWORD=your_smtp_password
ALERT_FROM_EMAIL=alerts@aquora.local
ALERT_TO_EMAIL=patrol@safety.gov

# Official River Telemetry API Configuration
# National Water Data Portal (NWDP / NWIC) Ministry of Jal Shakti
NWIC_API_KEY=your_nwic_api_key_here
NWIC_API_BASE_URL=https://nwdp.gov.in/api/v1
NWIC_TIMEOUT_SECONDS=5.0
NWIC_CACHE_TTL_SECONDS=300.0

# USGS Instantaneous Water Services API (Public, no API key required)
USGS_API_BASE_URL=https://waterservices.usgs.gov/nwis/iv/
USGS_DEFAULT_SITE=11164500
USGS_TIMEOUT_SECONDS=6.0
USGS_CACHE_TTL_SECONDS=180.0

# Optional Google Gemini API Key
GEMINI_API_KEY=your_gemini_api_key_here
```


---

## 🚀 Running the Application Locally

### 1. Backend Setup

```bash
cd backend

# Create and activate Python virtual environment
python -m venv .venv
.venv\Scripts\Activate.ps1    # On Windows PowerShell
# source .venv/bin/activate    # On Linux/macOS

# Install dependencies
pip install -r requirements.txt

# Run the FastAPI server
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
Interactive API documentation: `http://localhost:8000/docs`.

### 2. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start Vite dev server
npm run dev
```
Access the application at `http://localhost:5173`.

### 3. Running Backend Tests & Frontend Production Build

```bash
# Run backend test suite (79 tests)
cd backend
.venv\Scripts\pytest.exe tests

# Run frontend TypeScript validation & production build
cd ../frontend
npm run build
```

---

## 🧪 Testing the Alert Workflow

1. Navigate to the **Authority Console / Dashboard** tab (`http://localhost:5173`).
2. Verify channel status in the Emergency Dispatch Console:
   - Webhook & SMTP configuration status will reflect your `.env` settings.
3. Test Safe Simulation Mode:
   - Keep **Safe Test Mode** toggled ON.
   - Click **Simulate Outbound Dispatch**.
   - Inspect the SQLite audit log; the delivery status will record as `TEST_MODE_SIMULATED`.
4. Test Deduplication:
   - Click dispatch again within 30 minutes with identical parameters.
   - Status will record as `DUPLICATE_SUPPRESSED`.
5. Automated Hazard Sweep:
   - In the **Automated Hazard Monitoring Engine** card, click **Run Immediate Hazard Sweep**.
   - The engine checks live stages and discharge thresholds, persists any breached warnings, and displays trigger breakdowns.

---

## ⚠️ Current Limitations & Ethical Declarations

### 1. Requirements for Genuine Live Kerala River Telemetry
- Real-time streaming telemetry for Kerala rivers (e.g., Ramamangalam Bridge on the Muvattupuzha River) requires official authorization from the **National Water Data Portal (NWDP / NWIC)** under the Ministry of Jal Shakti, Government of India.
- Until valid `NWIC_API_KEY` credentials are provided, AQUORA AI explicitly labels Indian river telemetry as `HISTORICAL ARCHIVE` or `LIVE FEED UNAVAILABLE`. Live readings are never faked.

### 2. Missing Datasets for a Genuine ML Drowning-Prediction Model
The current `AquaticRiskPredictor` is a domain-heuristic model. To develop and validate a legitimate supervised machine learning model for drowning incident prediction, the following empirical datasets would be required:
1. **Geo-located Incident Records:** Micro-level registry of past immersion incidents and drowning fatalities, recorded with exact GPS coordinates, date, and hour.
2. **Victim & Swimmer Exposure Data:** Swimmer headcount / recreation density counts at each aquatic site to normalize risk per exposure hour (avoiding base-rate fallacy).
3. **High-Resolution Micro-Bathymetry:** Sub-surface bed morphology detailing drop-offs, submerged weir undercurrents, and hydraulic rollers.
4. **Co-located Weather & Water Gauges:** Continuous coincident hourly water temperature, turbidity, and flow velocity measurements at the exact incident sites.

AQUORA AI strictly adheres to engineering ethics: **We do not train models on fabricated casualty labels.**

---

## 📄 License
MIT License. Developed for water safety and hydrological risk awareness.
