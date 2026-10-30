# AQUORA AI — RESTful API Reference Manual

**Base URL:** `http://localhost:8000/api/v1`  
**Protocol:** HTTP REST with JSON Payloads  
**Interactive Docs:** `http://localhost:8000/docs` (Swagger UI) or `/redoc`

---

## 1. System Health & Diagnostics

### `GET /health`
Returns the operational health and connectivity status of the backend services, ML engine, database, and background scheduler.
- **Response `200 OK`:**
  ```json
  {
    "status": "healthy",
    "timestamp": "2026-10-29T16:15:00Z",
    "version": "1.0.0",
    "database": "connected",
    "ml_service": "online",
    "weather_service": "online",
    "active_stations_monitored": 22
  }
  ```

---

## 2. Water Bodies & GIS Subsystem

### `GET /water-bodies`
Returns all monitored water bodies in the active directory with current risk assessments.
- **Query Parameters:**
  - `type` (optional): Filter by type (`river`, `lake`, `quarry`, `waterfall`, `reservoir`, `canal`).
  - `risk_level` (optional): Filter by risk (`low`, `moderate`, `high`, `critical`).
  - `district` (optional): Filter by Kerala district.

### `GET /waterbodies/search`
Fast keyword and substring search matching across names, typologies, and river basins.
- **Query Parameters:** `q` (string, required)

### `GET /rivers/nearby`
Finds monitored stations nearest to a given GPS coordinate using spherical Haversine distance calculations.
- **Query Parameters:**
  - `lat` (float, required): Latitude (-90 to +90).
  - `lng` (float, required): Longitude (-180 to +180).
  - `max_distance_km` (float, optional, default: 50.0).

### `GET /waterbodies/stats`
Returns aggregated GIS counts categorized by waterbody type, district, and hazard category.

---

## 3. Environmental Hazard & What-If Simulation

### `GET /drowning-risk`
Evaluates and returns risk ratings across monitored water bodies using the two-layer scoring architecture.

### `POST /drowning-risk/assess`
Calculates an on-demand environmental hazard score for user-supplied hydrological inputs.
- **Request Body:**
  ```json
  {
    "water_body_name": "Ramamangalam Bridge",
    "water_body_type": "river",
    "latitude": 9.9482,
    "longitude": 76.5412,
    "water_level_m": 3.8,
    "flow_rate_cms": 5.2,
    "water_temp_c": 22.0
  }
  ```

### `POST /drowning-risk/simulate`
Executes an experimental What-If scenario simulation comparing baseline hazard scores against simulated rainfall, stage deltas, and discharge increments.
- **Request Body:**
  ```json
  {
    "water_body_id": 1,
    "simulated_rainfall_increment_mm": 45.0,
    "simulated_stage_delta_m": 0.40,
    "simulated_discharge_increment_cms": 3.5,
    "simulated_exposure_scenario": "Monsoon Flash Surge"
  }
  ```

---

## 4. Machine Learning River Level Forecasting

### `POST /river-data/forecast`
Generates a 1-hour-ahead river stage prediction ($h_{t+1}$) using scikit-learn Ridge Regression with 25 kinematic delta features.
- **Request Body:**
  ```json
  {
    "station_name": "RAMAMANGALAM BRIDGE",
    "readings": [
      { "timestamp": "2026-10-29T00:00:00Z", "water_level_m": 3.10 },
      "..." // Exactly 13 consecutive hourly readings
      { "timestamp": "2026-10-29T12:00:00Z", "water_level_m": 3.42 }
    ]
  }
  ```
- **Response `200 OK`:**
  ```json
  {
    "station_name": "RAMAMANGALAM BRIDGE",
    "current_water_level_m": 3.42,
    "predicted_water_level_m": 3.46,
    "forecast_horizon_hours": 1,
    "target_timestamp": "2026-10-29T13:00:00Z",
    "model_type": "Ridge Regression (alpha=100.0)",
    "mae_held_out_m": 0.0347,
    "r2_held_out": 0.9842,
    "persistence_mae_m": 0.0573,
    "improvement_over_persistence_pct": 39.4,
    "scientific_disclaimer": "Forecast predicts physical river stage (m), NOT individual drowning events."
  }
  ```

### `GET /river-data/{station_name}`
Retrieves 24-hour historical telemetry trajectory observations.
- **Path Parameter:** `station_name` (`RAMAMANGALAM-BRIDGE`, `PALA`, `TRINAYAKUDAM`).
- **Query Parameter:** `mode` (`historical`, `latest`).

### `GET /river-data/forecast-vs-observation`
Returns aligned ground-truth actual observations vs 1h-ahead model forecasts for visual validation.

---

## 5. Municipal Site Safety Inspections & Governance

### `GET /authority/inspection-prioritization`
Calculates an automated multi-factor prioritization triage queue ranking monitored and unmonitored sites into `CRITICAL`, `HIGH`, `MEDIUM`, and `ROUTINE` audit tiers.

### `POST /authority/inspections`
Creates and persists an official municipal safety inspection record in the SQLite database.
- **Request Body:**
  ```json
  {
    "water_body_id": 1,
    "water_body_name": "Ramamangalam Bridge",
    "water_body_type": "river",
    "district": "Ernakulam",
    "priority_tier": "HIGH",
    "priority_rank_score": 68.5,
    "inspector_name": "KSDMA Quick Response Unit",
    "scheduled_date": "2026-11-05",
    "environmental_hazard_score": 52.0,
    "composite_risk_score": 52.0,
    "contributing_factors": ["Stage surge variance", "Unfenced public ghats"],
    "suggested_focus": ["Audit lifebuoy stations", "Inspect safety warning signs"],
    "findings_notes": "Scheduled pre-monsoon safety barrier check",
    "action_required": true
  }
  ```

### `GET /authority/inspections`
Lists persisted inspection records with filtering options.
- **Query Parameters:**
  - `water_body_id` (int, optional)
  - `status` (string, optional: `SCHEDULED`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`)
  - `priority` (string, optional: `CRITICAL`, `HIGH`, `MEDIUM`, `ROUTINE`)

### `PATCH /authority/inspections/{inspection_id}`
Updates inspection status, completion timestamp, verified safety measures, and remediation findings.
- **Request Body:**
  ```json
  {
    "status": "COMPLETED",
    "completed_date": "2026-10-29T16:00:00Z",
    "safety_measures_verified": ["Warning signboards intact", "Handrail secured"],
    "findings_notes": "Audit completed. Public handrail repairs verified.",
    "action_required": false
  }
  ```

### `GET /authority/inspections/trends/summary`
Returns longitudinal inspection trends. If database records $< 5$, returns `has_sufficient_history: false` with explanatory rationale to avoid misleading statistical extrapolation.

---

## 6. Alerts & Automated Monitoring

### `POST /alerts/dispatch`
Issues an emergency incident notice through configured channels (`webhook`, `email`, `sms`). Enforces safe simulation by default when `test_mode: true`.

### `GET /alerts/deliveries`
Returns recent outbound delivery records, confirmation statuses, and dispatch latency from the `alert_deliveries` audit table.

### `POST /monitoring/evaluate`
Executes an immediate automated evaluation sweep across monitored stations to check for threshold breaches (stage surge $\ge +0.15\text{ m/h}$, discharge $\ge 6.00\text{ m}^3\text{/s}$).


---

## 7. Authentication & Role-Based Access Control (RBAC)

### `POST /auth/login`
Authenticates official credentials and returns a signed bearer token.
- **Request Body:**
  ```json
  {
    "username": "admin",
    "password": "Admin@Aquora2026!"
  }
  ```
- **Response `200 OK`:**
  ```json
  {
    "access_token": "eyJhbGciOi...",
    "token_type": "bearer",
    "expires_in_seconds": 28800,
    "user": {
      "id": 1,
      "email": "admin@aquora.gov.in",
      "username": "admin",
      "full_name": "KSDMA State Administrator",
      "role": "ADMIN",
      "organization": "Kerala State Disaster Management Authority",
      "is_active": true
    }
  }
  ```

### `GET /auth/me`
Returns the profile and authorized privileges of the authenticated caller. Requires `Authorization: Bearer <token>`.

### `POST /auth/logout`
Terminates the client session and invalidates active token scope.

### `POST /auth/register`
Provisions a new personnel account. Restricted to `ADMIN` and `OFFICER` roles.
- **Request Body:** `UserCreateRequest` (`email`, `username`, `full_name`, `password`, `role`, `organization`).

### `POST /auth/change-password`
Updates user account password with cryptographic salt rotation. Requires valid current password.

### `GET /auth/roles`
Returns the documented operational authorization matrix across `ADMIN`, `OFFICER`, `INSPECTOR`, and `VIEWER`.

---

## 8. Data Management & Disaster Recovery

### `GET /data/export/water-bodies`
Downloads an RFC 4180 compliant CSV export containing all registered aquatic monitoring sites.

### `GET /data/export/inspections`
Downloads an RFC 4180 compliant CSV export of all safety audits and field remediations.

### `POST /data/import/water-bodies`
Ingests a CSV dataset of water bodies with duplicate detection and Kerala geographic bounding box verification (`8.0°N-13.0°N`, `74.5°E-77.8°E`).

### `GET /data/backup`
Generates and downloads an atomic binary snapshot of the active SQLite database (`aquora.db`) for operational disaster recovery.

---

## 9. Decision Support Reporting & Analytics

### `GET /reports/hazard-assessment/{water_body_id}`
Returns a print-to-PDF optimized HTML safety dossier for the specified water body, formatted with official sign-off seals, Layer A hydrodynamic breakdown, Layer B structural vulnerability, and recommended interventions.

### `GET /reports/hazard-assessment/{water_body_id}/json`
Returns the structured report payload (executive summary, timestamps, data provenance, risk scores) as JSON.

### `GET /reports/district-summary`
Aggregates monitored sites, high/extreme risk zones, and pending safety inspections across all 14 Kerala administrative districts.

### `GET /reports/model-benchmarks`
Returns documented ML benchmark performance metrics for both the River Stage Forecaster (Ridge Regression: MAE $0.0094\text{m}$, RMSE $0.0152\text{m}$, $R^2 = 0.9824$) and the Calibrated Aquatic Classifier (HistGradientBoosting / Brier score $0.0821$, ROC-AUC $0.9415$).

---

## 10. System Administration & Telemetry Status

### `GET /admin/diagnostics`
Inspects runtime telemetry, Uptime, SQLite database size and table row counts, machine learning model status, and background monitoring schedulers.

### `GET /admin/users`
Returns personnel user management directory with active status and last login timestamps. Restricted to `ADMIN`.

### `PATCH /admin/users/{user_id}`
Updates personnel status (`is_active: bool`) or reassigns organizational roles.

### `GET /admin/logs`
Returns the in-memory circular buffer of recent operational activity logs (last 50-200 events).

### `POST /alerts/validate-channels`
Non-intrusively tests outbound alert channels (Webhook, SMTP, SMS) for reachability, syntax, and connectivity readiness without sending unsolicited alerts.

### `GET /telemetry/providers/status`
Returns authentic operational status and registration requirements across USGS Waterservices, NWIC / India-WRIS, and Open-Meteo providers.
