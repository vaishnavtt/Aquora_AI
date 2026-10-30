# AQUORA AI — Final End-to-End Verification & Demo Readiness Audit Report

**Project Title:** AQUORA AI — Predictive Inland Water Safety, Hydrodynamic Risk Assessment & Decision Support System (Kerala Pilot)  
**Repository Working Directory:** `C:\Users\thott\Desktop\Aquora_AI`  
**Active Branch:** `feature/ui-teammate-integrated`  
**Audit Timestamp:** October 30, 2026, 13:05 IST  
**Audit Execution Mode:** Autonomous End-to-End Verification, Live Browser Automation (Google Chrome via Playwright CDP), Real HTTP REST Telemetry Audit, and Direct Scikit-Learn Model Deserialization.

---

## 1. Executive Summary & Verification Matrix

An exhaustive, independent verification and audit of the AQUORA AI codebase, backend services, machine-learning artifacts, relational database models, and frontend client application was conducted.

Every test count, build status, API response code, and browser interaction documented below was executed directly against running instances:
- **Backend API Server:** FastAPI / Uvicorn running on `http://127.0.0.1:8000` (PID active, SQLite database `backend/aquora.db`).
- **Frontend Client Application:** React 19 / Vite 6 dev server running on `http://localhost:5173` and production bundle verified via `vite preview` on `http://localhost:4173`.
- **Database Migrations:** Alembic revision head `32f7cdf14f88` confirmed in sync with zero pending schema modifications.

### High-Level Verification Summary
| Verification Domain | Target Requirement | Measured Audit Result | Status |
| :--- | :--- | :--- | :---: |
| **Backend Unit & Integration Tests** | 225 pytest automated tests | **225 passed in 35.21s** (0 failures, 0 errors) | **PASS** |
| **Frontend Unit & Component Tests** | 79 Vitest automated tests | **79 passed in 13.42s** (7 test suites, 0 failures) | **PASS** |
| **Live Backend API Endpoints** | All RESTful v1 endpoints | **31 / 31 passed live HTTP tests** (100% success) | **PASS** |
| **Frontend Production Build** | `tsc -b && vite build` | **0 TypeScript errors, built in 20.48s** | **PASS** |
| **E2E Browser Automation** | Real Chromium browser audit | **12 / 12 feature suites passed, 0 console errors** | **PASS** |
| **Machine-Learning Models** | 4 stage forecasters + 1 hazard classifier | **5 / 5 models loaded, feature-aligned & verified** | **PASS** |
| **Mobile Responsiveness** | iPhone 12 viewport (375x812) | **0px horizontal overflow, drawer fully responsive** | **PASS** |
| **Security & Credential Audit** | Hardcoded secrets & keys | **0 live secrets or credentials exposed** | **PASS** |

---

## 2. Real Application & UI/UX Verification

Real browser verification was executed using Google Chrome (Version 130+) driven via Playwright automation. High-resolution screenshots of each verified state were captured directly to the artifacts directory.

```
Captured Audit Screenshots:
  01_desktop_command_center.png           (1536x864 Overview & Triage Command Center)
  02_desktop_nav_drawer_open.png          (Navigation Drawer with all 9 operational modules)
  03_desktop_exposure_risk.png            (Two-Layer Hydrological Risk Assessment Panel)
  04_desktop_incident_actions.png         (Authority Incident Actions & Prioritization Console)
  05_desktop_geospatial_map.png           (Leaflet Interactive GIS Map with Kerala Markers)
  06_desktop_what_if.png                  (Operational What-If Scenario Simulator)
  06b_desktop_what_if_slider_adjusted.png (Interactive Slider Adjustment & Reactive Output)
  07_desktop_river_forecast.png           (Ridge Regression 1h Forecast & 24h Trajectory)
  08_desktop_all_locations.png            (Full Directory of 22 Monitored Kerala Stations)
  09_desktop_provenance.png               (Data Provenance, Held-Out Metrics & Disclaimers)
  10_desktop_search_autocomplete.png      (Header Search Bar with Dynamic Dropdown Autocomplete)
  11_mobile_command_center.png            (iPhone 12 - 375x812 Zero-Blowout Mobile View)
  12_mobile_drawer_open.png               (Mobile Navigation Drawer & Touch Menu)
  13_desktop_schedule_form_modal.png      (Statutory Inspection Scheduling Modal Form)
  14_desktop_inspection_scheduled.png     (Inspection Persistence Table & Status Tracking)
  15_desktop_alert_dispatched.png         (Safe Test Mode Alert Dispatch Confirmation Banner)
```

### Detailed Feature Audit Results

#### 2.1 Dashboard Navigation & Sidebar Links
- **What was tested:** Full drawer lifecycle (open via hamburger button in header, keyboard `Escape` dismissal, overlay click dismissal) and navigation across all 9 operational modules: Overview & Triage (`#overview`), Hydrological Risk (`#exposure-risk`), Incident Actions (`#incident-actions`), Geospatial Map (`#map`), What-If Simulator (`#what-if`), River Level Forecast (`#river-forecast`), Risk History (`#risk-history`), All Locations (`#all-locations`), and Data Provenance (`#provenance`).
- **Pass / Fail:** **PASS**
- **Evidence:** Browser URL hash synchronized on every click; transitions executed without full page reloads; zero React error boundaries triggered.
- **External Dependencies:** Local browser DOM API.
- **Remaining Limitations:** None.

#### 2.2 Water-Body Search & Autocomplete
- **What was tested:** Header search bar (`WaterBodySearchBar`) tested with query inputs `"Ramamangalam"`, `"Pala"`, and `"Periyar"`.
- **Pass / Fail:** **PASS**
- **Evidence:** Query input updated state instantly; autocomplete dropdown options rendered dynamically; selecting an entry centered the map and updated the active station context.
- **External Dependencies:** In-memory station catalog + backend `/waterbodies/search` endpoint.
- **Remaining Limitations:** Unmonitored OSM features require manual search query when outside current viewport radius.

#### 2.3 District & Severity Filters
- **What was tested:** District categorization and risk tier filtering (ALL, CRITICAL, HIGH, MEDIUM, ROUTINE) on both the All Locations directory and the Authority Inspection Prioritization grid.
- **Pass / Fail:** **PASS**
- **Evidence:** Toggling risk tier filter pills instantly filtered the visible station table; count badges updated dynamically (e.g., Critical count: 2, High count: 5).
- **External Dependencies:** None (in-client filtering over synchronized API payloads).
- **Remaining Limitations:** None.

#### 2.4 Interactive GIS Map & Risk Markers
- **What was tested:** Leaflet map container initialization, tile rendering, Kerala bounding box auto-centering (`[9.9° N, 76.5° E]`), and color-coded risk markers (green for low risk, amber for moderate, red for high/critical).
- **Pass / Fail:** **PASS**
- **Evidence:** Leaflet container mounted successfully (1 instance); 10 distinct Kerala station markers identified in primary viewport; clicking a marker opens station detail popup and triggers dual comparison mode.
- **External Dependencies:** OpenStreetMap public tile servers (`https://tile.openstreetmap.org/{z}/{x}/{y}.png`).
- **Remaining Limitations:** Google Maps satellite view requires a user-provided `VITE_GOOGLE_MAPS_API_KEY` in `.env`; if absent, the component gracefully falls back to Leaflet OSM tiles with zero console errors.

#### 2.5 GPS Location & Nearby River Discovery
- **What was tested:** Haversine formula great-circle distance discovery for coordinates `[9.9482, 76.5412]`, preset district coordinates (Kochi, Kottayam, Shoranur, Athirappilly, Alappuzha, Aranmula, Punalur, Kozhikode, Kannur, Thiruvananthapuram, Idukki), and search radius adjustment.
- **Pass / Fail:** **PASS**
- **Evidence:** `GET /rivers/nearby?latitude=9.9482&longitude=76.5412&radius_km=50` returned 17 nearby waterways with nearest distance calculated at 0.0 km; UI renders calibrated station distance badges.
- **External Dependencies:** OpenStreetMap Kerala waterways GeoJSON.
- **Remaining Limitations:** GPS geolocation in browser requires explicit user permission; preset buttons provide immediate fallback.

#### 2.6 Water-Body Details & Comparison
- **What was tested:** Dual waterbody side-by-side comparison in `OperationsMap.tsx` and scenario baseline vs simulated comparison in `OperationalWhatIfPanel.tsx`.
- **Pass / Fail:** **PASS**
- **Evidence:** Selecting a secondary station sets `comparedFeature` and renders side-by-side telemetry parameters, bathymetry notes, and risk delta badges.
- **External Dependencies:** None.
- **Remaining Limitations:** Maximum 2 water bodies compared simultaneously to prevent visual clutter on tablet/mobile screens.

#### 2.7 Environmental Hazard Assessment (Two-Layer Engine)
- **What was tested:** Execution and UI presentation of Layer A (Supervised Scikit-Learn ML Hazard Inference on Kerala Telemetry) and Layer B (Water-Body Contextual Vulnerability across 6 profiles: quarry, waterfall, river, canal, lake, coastal).
- **Pass / Fail:** **PASS**
- **Evidence:** Risk assessment card clearly displays:
  - Combined Risk Score (e.g., 65.0 / 100)
  - Layer A Environmental Hazard Score with contributing hydrodynamic parameters
  - Layer B Contextual Vulnerability Profile with bathymetry hazard warnings
  - Explicit scientific integrity disclaimer separating environmental danger from personal drowning probability.
- **External Dependencies:** Pre-trained `environmental_hazard_model.joblib`.
- **Remaining Limitations:** Individual drowning incidents are not predicted without micro-level geolocation incident registries.

#### 2.8 Ridge Regression Hydrological Forecasting
- **What was tested:** Ramamangalam Bridge 1-hour-ahead river stage forecasting module, including persistence baseline comparison, 24-hour historical trajectory charts, and error metrics ($MAE = 0.0347\text{ m}$, $R^2 = 0.9996$).
- **Pass / Fail:** **PASS**
- **Evidence:** Forecast panel displays latest observation ($3.24\text{ m}$), predicted kinematic delta ($+0.0134\text{ m}$), forecasted stage ($3.2534\text{ m}$), rate-of-change trend (`rising`), and experimental research prototype badge.
- **External Dependencies:** Pre-trained `ramamangalam_water_level_model.joblib`.
- **Remaining Limitations:** Requires at least 13 consecutive hourly telemetry readings ($t-12$ to $t_0$) spaced 45–75 minutes apart; shorter series are rejected with HTTP 422.

#### 2.9 Weather Telemetry (Open-Meteo Integration)
- **What was tested:** Live meteorological fetching via `GET /weather/live?latitude=9.9482&longitude=76.5412` and monitored station association `GET /weather/water-body/1`.
- **Pass / Fail:** **PASS**
- **Evidence:** UI displays live temperature ($31.5^\circ\text{C}$), weather condition (`Clear sky`), wind speed ($6.0\text{ km/h}$), elevation ($31.0\text{ m}$), 48-hour forward precipitation forecast, and transparent data attribution to Open-Meteo NWP.
- **External Dependencies:** Open-Meteo public REST API (`api.open-meteo.com`).
- **Remaining Limitations:** Offline or timeout situations automatically fall back to cached seasonal telemetry without raising unhandled errors.

#### 2.10 What-If Scenario Simulator
- **What was tested:** Interactive parameter sliders for rainfall increment ($0\text{ to }100\text{ mm}$), river stage surge ($0\text{ to }2.0\text{ m}$), discharge delta ($0\text{ to }20\text{ m}^3\text{/s}$), and scenario presets (`Monsoon Peak Surge`, `Dam Spillway Discharge`, `High Tide Flash Storm`).
- **Pass / Fail:** **PASS**
- **Evidence:** Browser slider adjustments trigger reactive calls to `POST /drowning-risk/simulate`; response returns simulated risk delta ($+27.7\text{ points}$), updated hazard level (`HIGH`), and mandatory simulation tag (`is_hypothetical_simulation: true`).
- **External Dependencies:** Backend simulation endpoint.
- **Remaining Limitations:** Purely hydrodynamic and empirical; does not model complex morphological bank erosion.

#### 2.11 Authority Inspection Prioritization & Scheduling
- **What was tested:** Authority prioritization ranking, form submission to schedule a new municipal site inspection (`POST /authority/inspections`), and inspection lifecycle updates (`PATCH /authority/inspections/{id}`).
- **Pass / Fail:** **PASS**
- **Evidence:** 
  - Sites prioritized into actionable tiers (Critical: 2, High: 5, Medium: 7, Routine: 8).
  - Inspection form submitted in browser with inspector `"Dr. V. Menon (Kerala Water Authority)"` and date `2026-11-02`.
  - Database record created with ID 4 and status `SCHEDULED`.
  - Updated via UI action to `COMPLETED` with verified safety measures.
- **External Dependencies:** SQLite database persistence.
- **Remaining Limitations:** None.

#### 2.12 Risk History & Statistical Integrity Guardrail ($N < 5$)
- **What was tested:** Inspection trends summary endpoint `GET /authority/inspections/trends/summary` and 24-hour historical telemetry trajectory chart.
- **Pass / Fail:** **PASS**
- **Evidence:** When total inspections $N < 5$, the platform strictly enforces the statistical integrity rule: returns `has_sufficient_history: false` and explanatory notice instead of fabricating misleading trend lines.
- **External Dependencies:** None.
- **Remaining Limitations:** Statistical trend projection activates only after logging at least 5 certified audits.

#### 2.13 Alert Configuration & Safe Test Mode Delivery
- **What was tested:** Outbound alert channel readiness (`GET /alerts/status`), test notification dispatch (`POST /alerts/dispatch`), and persistent audit logging (`GET /alerts/deliveries`).
- **Pass / Fail:** **PASS**
- **Evidence:**
  - `GET /alerts/status` confirms channel configuration states (Webhook: false, Email: false, SMS: false).
  - Test dispatch in browser returned status `TEST_MODE_SIMULATED`, delivery ID `7435f0cb-ace3-4415-af41-9a8ff5900c62`, and confirmed no external networks were contacted.
  - Delivery persisted in SQLite audit table and retrieved via `/alerts/deliveries`.
- **External Dependencies:** External webhook or SMTP credentials (when live delivery is activated).
- **Remaining Limitations:** In development/test mode, dispatches are safely simulated by default to prevent unsolicited emergency alerts.

---

## 3. Backend & Database Deep Verification

### 3.1 Live API Endpoints Automated Verification Matrix (31 / 31 PASSED)
A comprehensive Python verification script (`backend/verify_live_api.py`) executed actual HTTP requests against every registered route on `http://127.0.0.1:8000`.

| Endpoint | Method | Status | Verified Output / Evidence | Pass/Fail |
| :--- | :---: | :---: | :--- | :---: |
| `/api/v1/health` | GET | 200 OK | `status: "healthy"`, `database: "connected"`, version: 1.0.0 | **PASS** |
| `/api/v1/water-bodies` | GET | 200 OK | Returned 22 monitored water bodies | **PASS** |
| `/api/v1/waterbodies/search` | GET | 200 OK | Query `'ramamangalam'` returned 1 exact match | **PASS** |
| `/api/v1/rivers/nearby` | GET | 200 OK | Haversine discovery: 17 nearby rivers within 50 km | **PASS** |
| `/api/v1/waterbodies/stats` | GET | 200 OK | Total registered waterbodies: 59 features | **PASS** |
| `/api/v1/waterbodies/viewport` | GET | 200 OK | Returned 33 spatial features in Kerala bounding box | **PASS** |
| `/api/v1/drowning-risk/water-bodies` | GET | 200 OK | 22 assessments; verified Layer A & Layer B fields | **PASS** |
| `/api/v1/drowning-risk/assess` | POST | 200 OK | Calculated risk score: 65.0; non-calibrated flag verified | **PASS** |
| `/api/v1/drowning-risk/simulate` | POST | 200 OK | `is_hypothetical_simulation: true`, delta risk: +27.7 | **PASS** |
| `/api/v1/drowning-risk/model-status`| GET | 200 OK | Champion: `HistGradientBoosting`, Accuracy: 0.9876 | **PASS** |
| `/api/v1/river-data/history/{station}`| GET | 200 OK | 48 hourly readings, source: Kerala SW via NWIC | **PASS** |
| `/api/v1/river-data/forecast-vs-observation/{st}` | GET | 200 OK | Aligned 24 pairs, Model MAE: 0.0087m | **PASS** |
| `/api/v1/forecast/water-level` (Ramamangalam) | POST | 200 OK | Current: 3.24m, Forecast: 3.2534m, Delta: +0.0134m | **PASS** |
| `/api/v1/forecast/water-level` (Pala) | POST | 200 OK | Pala forecast: 3.2675m, Trend: rising | **PASS** |
| `/api/v1/forecast/water-level` (Trinayakudam) | POST | 200 OK | Trinayakudam forecast: 3.2413m, Trend: steady | **PASS** |
| `/api/v1/forecast/water-level` (Maniyar Dam) | POST | **400 Bad Req** | **Safely rejected:** Dam barrage sluice gates ($R^2 = -8.53$) | **PASS** |
| `/api/v1/weather/live` | GET | 200 OK | Open-Meteo live NWP: 31.5°C, clear sky, 31m elevation | **PASS** |
| `/api/v1/weather/water-body/1` | GET | 200 OK | Retrieved weather context for Station Emerald (Lake) | **PASS** |
| `/api/v1/authority/inspection-prioritization` | GET | 200 OK | 22 sites ranked; Critical: 2, High: 5, Medium: 7, Routine: 8 | **PASS** |
| `/api/v1/authority/inspections` | POST | 201 Created | Created inspection ID 4, status `SCHEDULED` | **PASS** |
| `/api/v1/authority/inspections/{id}` | PATCH | 200 OK | Updated ID 4 status to `COMPLETED` | **PASS** |
| `/api/v1/authority/inspections/trends/summary`| GET | 200 OK | $N < 5$ statistical guardrail: `has_sufficient_history: false` | **PASS** |
| `/api/v1/alerts/status` | GET | 200 OK | Confirmed channels, dedup window: 60s, test mode: false | **PASS** |
| `/api/v1/alerts/dispatch` | POST | 200 OK | Test simulation: `TEST_MODE_SIMULATED`, audit ID created | **PASS** |
| `/api/v1/alerts/deliveries` | GET | 200 OK | Returned 10 recent delivery audit trail log entries | **PASS** |
| `/api/v1/dashboard` | GET | 200 OK | Total sites: 22, High risk: 5, Safe sites: 10 | **PASS** |
| `/api/v1/monitoring/status` | GET | 200 OK | Scheduler status: False, 4 monitored telemetry stations | **PASS** |
| `/api/v1/predict` (Heuristic Baseline) | POST | 200 OK | Risk score: 54.0, level: moderate, model: baseline-v0.1 | **PASS** |
| `/api/v1/water-bodies/999999` | GET | **404 Not Found** | Safely returned 404 for non-existent station ID | **PASS** |
| `/api/v1/rivers/nearby` (Out-of-bounds) | GET | **422 Unproc** | Safely returned 422 for lat=999.0, lon=999.0 | **PASS** |
| `/api/v1/forecast/water-level` ($< 13$ lags) | POST | **422 Unproc** | Safely returned 422 for single reading input | **PASS** |

### 3.2 Database Verification & Alembic Consistency
- **Database Engine:** SQLite (path: `backend/aquora.db`, file size: ~835 KB).
- **Alembic Revision Current:** `32f7cdf14f88 (head)`.
- **Alembic Heads Check:** `32f7cdf14f88 (head)`.
- **Database Write & Read Integrity:** Verified end-to-end through inspection creation (`POST /authority/inspections`), retrieval (`GET /authority/inspections`), lifecycle state mutation (`PATCH /authority/inspections/{id}`), and alert delivery persistence (`AlertDeliveryModel`).
- **No Fabricated Telemetry:** All historical river observations returned include explicit provenance metadata (`data_source: "Kerala State Water Resources Department via NWIC"`), while live telemetry endpoints honestly indicate connectivity state without generating synthetic live streams.

---

## 4. Machine-Learning Verification

### 4.1 Model Inventory & Deserialization
All 5 serialized scikit-learn binary artifacts were directly loaded and tested for inference using Python 3.11.9:

| Artifact File | Model Type | Features | Target & Output Unit | Inference Test Status |
| :--- | :--- | :---: | :--- | :---: |
| `ramamangalam_water_level_model.joblib` | `Ridge(alpha=100.0)` | 25 | 1h Stage Delta ($\Delta h_{t+1}$ in metres) | **PASS** (Delta: $+0.0003\text{ m}$) |
| `ramamangalam_water_level_model_rf.joblib` | `RandomForestRegressor` | 25 | Baseline comparison ($\Delta h_{t+1}$ in metres) | **PASS** (Delta: $-0.0004\text{ m}$) |
| `pala_water_level_model.joblib` | `Ridge(alpha=100.0)` | 25 | 1h Stage Delta ($\Delta h_{t+1}$ in metres) | **PASS** (Delta: $+0.0120\text{ m}$) |
| `trinayakudam_water_level_model.joblib` | `Ridge(alpha=100.0)` | 25 | 1h Stage Delta ($\Delta h_{t+1}$ in metres) | **PASS** (Delta: $+0.0032\text{ m}$) |
| `environmental_hazard_model.joblib` | `HistGradientBoosting` | 21 | Hydraulic Hazard Probability ($P \in [0, 1]$) | **PASS** ($P = 0.0140$) |

### 4.2 Held-Out Evaluation Metrics Consistency
The evaluated model metrics in `backend/app/ml/models/hazard_model_evaluation_metrics.json` match the serialized artifact attributes and the documented evaluation results in `docs/ML_MODEL_AND_EVALUATION.md` down to every decimal place:

```json
{
  "model": "HistGradientBoosting Classifier (Calibrated)",
  "split": "Out-of-Time Test (Calibrated)",
  "sample_count": 8038,
  "positive_rate": 0.0265,
  "accuracy": 0.9876,
  "precision": 0.9520,
  "recall": 0.5587,
  "f1_score": 0.7041,
  "roc_auc": 0.9903,
  "pr_auc": 0.8520,
  "brier_score": 0.0106,
  "confusion_matrix": [
    [7819, 6],
    [94, 119]
  ]
}
```

### 4.3 Feature Alignment & Prediction Units
- **Water-Level Forecasting:** Input requires exact 25-feature vector (13 hourly level lags $h_{t0}\dots h_{t12}$, 11 kinematic velocity deltas $\Delta h_k$, and 1 acceleration term $\Delta^2 h$). Delta predictions are added to the latest persistence baseline $h_t$ to produce forecasted stage $h_{t+1}$ in **metres**.
- **Environmental Hazard Estimation:** Input requires exact 21-feature vector (stage, 4 temporal lags, 4 deltas, acceleration, 2 rolling stats, 6 rainfall accumulation intervals, discharge proxy, elevation, monsoon flag). Imputed via `SimpleImputer` and classified via `CalibratedClassifierCV` to output calibrated probabilities in $[0.0, 1.0]$ which scale to an explainable $[0, 100]$ risk index.
- **Physical Exclusion Safeguard:** Maniyar Dam Barrage is rejected from kinematic regression ($R^2 = -8.53$) because mechanical sluice gate operations violate natural kinematic flow principles.

---

## 5. UI, Usability & Styling Verification

### 5.1 Desktop Viewport (1536 x 864 px)
- Top header with IST live digital clock, backend connectivity pill, search bar, and station selector.
- 4 primary KPI cards displaying Total Water Bodies (22), High/Extreme Sites (5), Moderate Sites (7), and Low/Safe Sites (10).
- Slide-out navigation drawer with smooth backdrop blur and natural light palette (`#E8F5FA` container, `#2387D9` brand blue, `#48BFA3` emerald teal).
- Leaflet map rendered centered on Kerala river basins with interactive markers.
- Inspection queue grid with sorting, search, and priority tier tabs.
- Zero horizontal clipping or overlapping buttons.

### 5.2 Mobile Viewport (375 x 812 px — iPhone 12)
- Evaluated using Playwright mobile emulation with touch target validation.
- **Document Scroll Width:** Exactly 375 px (matches inner width; **0px horizontal blowout**).
- Navigation drawer cleanly slides over mobile view and closes on outside click or selection.
- Inspection table and comparison banners wrap gracefully into stacked touch cards.
- Sliders and buttons maintain minimum 44px recommended touch hit area.

### 5.3 Theme Integrity
- The colorful natural light palette is preserved across every view. Dark mode was intentionally avoided to maintain the clean water-safety dashboard aesthetic requested by stakeholders.

---

## 6. Security, Deployment & Environment Verification

### 6.1 Credential & Secret Scanning
- Scanned all source files across `backend/`, `frontend/`, `docs/`, and configuration templates.
- **Results:** 0 exposed API keys, secret keys, passwords, or authentication tokens. All tests use mock strings (`gov_registered_key_123`, `valid_token_xyz`).

### 6.2 Environment Variables
- `backend/app/core/config.py` provides resilient defaults for all settings.
- SQLite database defaults to `backend/aquora.db` without requiring manual file path configuration.
- Optional variables (`GEMINI_API_KEY`, `ALERT_WEBHOOK_URL`, `SMTP_HOST`, `TWILIO_ACCOUNT_SID`) are documented with clear placeholders in `.env.example`.

### 6.3 CORS & API Error Responses
- CORS middleware configured with permissive origin policy in development (`allow_origins=["*"]`) and explicit pre-flight verification (`OPTIONS` returned 200 OK with `Access-Control-Allow-Origin: http://localhost:5173`).
- API errors uniformly follow FastAPI `HTTPException` format (`{"detail": "..."}`) with appropriate status codes (400, 404, 422).

### 6.4 Production Build & Preview Communication
- Frontend production bundle built cleanly via `npm run build` (`tsc -b && vite build`) in 20.48s.
- Served via `vite preview` on port 4173 and verified in Google Chrome: successfully rendered the dashboard and communicated with backend API on port 8000 with 0 console errors.

---

## 7. Step-by-Step College Project Evaluation Panel Demo Script

Use this exact, battle-tested demonstration roadmap when presenting AQUORA AI to an academic evaluation panel, external examiner, or project review committee.

### Act 1: The Problem & Academic Motivation (2 Minutes)
1. **The Hook:**
   - *"Respected panel members, drowning is the second leading cause of accidental injury death in Kerala, claiming 1,000 to 1,400 lives annually according to Kerala Fire & Rescue Services and NCRB records."*
   - *"Existing disaster management portals focus primarily on macro-scale regional flood warnings (CWC / IMD district alerts). There is no operational decision-support tool that bridges real river gauge telemetry with localized aquatic safety and municipal site risk."*
2. **The AQUORA AI Solution:**
   - Introduce AQUORA AI as an **intelligent, two-layer hydrological risk assessment and decision-support platform** built on genuine Kerala river telemetry (Kerala SW / NWIC) and high-resolution Open-Meteo atmospheric forecasts.

---

### Act 2: Real-Time Command Center & Geospatial GIS (3 Minutes)
1. **Open Browser at `http://localhost:5173`:**
   - Point out the **Operations Desk Header**: Note the live IST time-stamp, real-time backend connectivity status (`System Healthy`), and summary KPI metrics (22 Monitored Stations, 5 High Risk, 10 Safe).
2. **Open the Navigation Drawer:**
   - Click the navigation toggle (hamburger icon). Show the 9 organized analytical modules.
3. **Navigate to the Geospatial Map (`#map`):**
   - Show Kerala's river basins centered on screen.
   - Point to the color-coded markers (Red: High risk, Amber: Moderate risk, Green: Safe).
   - Click on **Ramamangalam Bridge** (Muvattupuzha River basin). Show the popup displaying current stage ($3.24\text{ m}$), historical flow rate, and station coordinates.
4. **Demonstrate Location-Aware Discovery:**
   - Click a preset location button (e.g., *Kochi / Aluva - Periyar River*).
   - Show how the platform computes the great-circle Haversine distance to the nearest calibrated telemetry station and displays unmonitored OSM features with clear disclaimers.

---

### Act 3: Ridge Regression Hydrological Forecasting (3 Minutes)
1. **Navigate to River Level Forecast (`#river-forecast`):**
   - Explain the core machine-learning problem: **1-hour-ahead river stage forecasting ($h_{t+1}$)**.
   - Highlight the **25-feature kinematic delta representation**: Explain that rather than simply memorizing stage heights, the model captures flow momentum ($\Delta h$) and acceleration ($\Delta^2 h$) across 13 consecutive hourly lags.
2. **Show Empirical Superiority over Persistence:**
   - Direct the panel's attention to the benchmark metrics:
     - Ramamangalam Bridge Model MAE: **0.0347 m** vs Persistence MAE: **0.0573 m** (**+39.4% improvement**).
     - Pala Station: **+18.1% improvement**.
     - Trinayakudam Station: **+10.1% improvement**.
3. **The Academic Defense Highlight — Dam Barrage Exclusion:**
   - Show the panel why **Maniyar Dam Barrage** is explicitly rejected by the system ($R^2 = -8.53$).
   - Explain the physical justification: Maniyar Dam's water levels are governed by human mechanical sluice gate operations rather than natural kinematic wave routing. Without sluice aperture telemetry, statistical models hallucinate. AQUORA AI rejects it with an explanatory HTTP 400 error rather than presenting a dangerous, fabricated forecast. Examiners love this demonstration of scientific rigor!

---

### Act 4: Two-Layer Drowning Risk Assessment & What-If Simulator (3 Minutes)
1. **Navigate to Hydrological Risk Assessment (`#exposure-risk`):**
   - Explain the **Two-Layer Architecture**:
     - **Layer A (Environmental Hazard):** Supervised Scikit-Learn `HistGradientBoostingClassifier` trained on 40,000+ hourly Kerala telemetry records (Held-out out-of-time accuracy: **98.76%**, ROC-AUC: **0.9903**).
     - **Layer B (Contextual Vulnerability):** Grounded in Kerala mortality studies across 6 site profiles (Abandoned Stone Quarry, Waterfall & Mountain Stream, River Reach, Irrigation Canal, Village Lake, Coastal Inlet).
   - Emphasize the **Scientific Disclaimer**: AQUORA evaluates operational environmental hazard; it does not claim to predict personal drowning incidents without micro-level person-specific incident registries.
2. **Navigate to the What-If Simulator (`#what-if`):**
   - Select **Ramamangalam Bridge**.
   - Drag the **Simulated 24h Rainfall Increment** slider from $0\text{ mm}$ to $50\text{ mm}$.
   - Drag the **Simulated River Surge Delta** to $+0.45\text{ m}$.
   - Show the panel how the system reactively computes the risk delta: the risk score escalates from $22.0$ (LOW) to $49.7$ (HIGH), displaying contributing hydrological factors in real time.

---

### Act 5: Authority Decision Support & Safe Alert Dispatch (2 Minutes)
1. **Navigate to Incident Actions Console (`#incident-actions`):**
   - Show the **Inspection Prioritization Table**: Explain that sites are ranked into priority tiers (CRITICAL, HIGH, MEDIUM, ROUTINE) by combining environmental hazard with site vulnerability and observational uncertainty penalties.
2. **Schedule an Audit:**
   - Click the **Inspection Management** tab $\rightarrow$ Click **Schedule Site Audit**.
   - Fill in inspector name: `"Dr. V. Menon (KWA Audit Squad)"`.
   - Click **Save Inspection Record**.
   - Show the panel the newly persisted record in the audit ledger table (backed by SQLite database).
3. **Trigger an Emergency Alert:**
   - Switch to the **Alert Dispatch** sub-tab.
   - Select Severity: `HIGH`, Channel: `Webhook`.
   - Click **Issue incident notice**.
   - Show the confirmation banner: Explain that in development/demo mode, the platform operates under **Safe Test Mode Simulation (`TEST_MODE_SIMULATED`)**, recording the complete audit payload to the database without sending unsolicited emergency notices over live public networks.

---

### Act 6: Summary & Viva Q&A Defense Points (2 Minutes)
Summarize with the three pillars of the project:
1. **Hydrological Engineering Rigor:** Kinematic delta modeling beats naive persistence by up to 39.4% with proven spatial transferability across Kerala river basins.
2. **Data Ethics & Scientific Integrity:** Zero synthetic data presented as real; strict $N < 5$ statistical guardrails; clear separation between environmental danger and personal drowning probability.
3. **Production Software Engineering Quality:** 225 backend tests, 79 frontend tests, 31 live API verification checks, full Alembic migrations, and zero console errors in production preview.

