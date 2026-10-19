# AQUORA AI — API Contract & Schema Specification

This document defines the REST API contract for `v1`. The frontend and backend must adhere strictly to these types and endpoints.

Base URL: `http://localhost:8000/api/v1`

---

## 1. System Health
### `GET /api/v1/health`
Checks backend responsiveness, database connection, and ML engine status.

**Query Parameters:** None

**Response Body (`200 OK`):**
```json
{
  "status": "healthy",
  "timestamp": "2026-10-14T18:10:00Z",
  "version": "1.0.0",
  "database": "connected",
  "ml_model_loaded": false
}
```

---

## 2. Water Bodies Directory
### `GET /api/v1/water-bodies`
Returns all monitored aquatic zones (lakes, rivers, reservoirs, coasts) with current risk indicators and coordinates for map rendering.

**Query Parameters:**
- `risk_level` *(optional, string)*: Filter by `low`, `moderate`, `high`, `extreme` (strict enum validation: invalid values return `422 Unprocessable Entity`)
- `type` *(optional, string)*: Filter by `lake`, `river`, `reservoir`, `coastal` (strict enum validation: invalid values return `422 Unprocessable Entity`)

**Response Body (`200 OK`):**
```json
[
  {
    "id": 1,
    "name": "Emerald Bay Reservoir (Demonstration Station)",
    "type": "reservoir",
    "latitude": 37.7749,
    "longitude": -122.4194,
    "current_risk_level": "low",
    "risk_score": 18.5,
    "water_temp_c": 21.0,
    "flow_rate_cms": 0.8,
    "depth_meters": 5.2,
    "last_updated": "2026-10-14T18:00:00Z",
    "description": "[DEMONSTRATION DATA] Calm sub-alpine lake basin with gentle circulation currents.",
    "is_demonstration_data": true
  },
  {
    "id": 2,
    "name": "Cascade Canyon River (Demonstration Station)",
    "type": "river",
    "latitude": 37.8044,
    "longitude": -122.2711,
    "current_risk_level": "high",
    "risk_score": 76.0,
    "water_temp_c": 12.5,
    "flow_rate_cms": 9.4,
    "depth_meters": 3.8,
    "last_updated": "2026-10-14T18:00:00Z",
    "description": "[DEMONSTRATION DATA] Steep canyon gorge river with surging snowmelt and dangerous undercurrents.",
    "is_demonstration_data": true
  }
]
```

### `GET /api/v1/water-bodies/{id}`
Returns details for a single monitored water body by its integer ID.

**Path Parameters:**
- `id` *(integer, required)*: The unique ID of the water body.

**Response Body (`200 OK`):** Single `WaterBody` object (as above).  
**Response Body (`404 Not Found`):**
```json
{
  "detail": "Water body with ID 999 not found."
}
```

---

## 3. Water Safety & Risk Prediction
### `POST /api/v1/predict`
Calculates an aquatic risk assessment based on environmental indicators.

> **Note:** Until model training is conducted by the ML lead, predictions are computed via an explainable baseline heuristic engine (`baseline-heuristic-v0.1`).

**Request Body (`application/json`):**
```json
{
  "water_body_id": 1,
  "water_temp_c": 13.5,
  "flow_rate_cms": 8.2,
  "depth_meters": 4.1,
  "rainfall_last_24h_mm": 42.0,
  "wind_speed_kmh": 31.5,
  "visibility_meters": 1500.0,
  "include_ai_explanation": false
}
```

**Field Validation Constraints:**
- `water_body_id`: integer, optional (can be null for ad-hoc point checks)
- `water_temp_c`: float, range `-5.0` to `45.0` (Celsius)
- `flow_rate_cms`: float, `>= 0.0` (Cubic meters per second)
- `depth_meters`: float, `>= 0.1` (Meters)
- `rainfall_last_24h_mm`: float, `>= 0.0` (Millimeters)
- `wind_speed_kmh`: float, `>= 0.0` (Kilometers per hour)
- `visibility_meters`: float, `>= 0.0` (Meters)
- `include_ai_explanation`: boolean, default `false`

**Response Body (`200 OK`):**
```json
{
  "risk_score": 78.4,
  "risk_level": "high",
  "confidence": 0.86,
  "primary_hazards": [
    "Rapid Current / High Flow",
    "Cold Water Shock Potential"
  ],
  "safety_recommendations": [
    "Swimming and wading strongly discouraged.",
    "Wear certified Personal Flotation Devices (PFD) near bank edges."
  ],
  "model_version": "baseline-heuristic-v0.1",
  "is_baseline_model": true,
  "ai_explanation": null
}
```

**Error Response (`404 Not Found`):** Returned if `water_body_id` is supplied but does not match any monitored site.
```json
{
  "detail": "Water body with ID 999 not found."
}
```

---

## 4. Executive Dashboard Metrics
### `GET /api/v1/dashboard`
Aggregated telemetry and status alerts across monitored sites for the overview dashboard.

**Query Parameters:** None

**Response Body (`200 OK`):**
```json
{
  "total_monitored_sites": 6,
  "high_risk_sites_count": 1,
  "safe_sites_count": 4,
  "moderate_risk_sites_count": 1,
  "system_status": "operational",
  "last_sync": "2026-10-14T18:00:00Z",
  "recent_alerts": [
    {
      "id": 101,
      "water_body_id": 2,
      "water_body_name": "Cascade Canyon River",
      "severity": "high",
      "message": "Water flow velocity elevated past safe threshold (9.4 m³/s).",
      "timestamp": "2026-10-14T17:45:00Z"
    }
  ]
}
```

---

## 5. Location by Coordinates Lookup
### `GET /api/v1/water-bodies/by-coordinates`
Queries the database for monitored stations near a geographic point. Returns `is_monitored: false` when no station exists, with a clear availability message.

**Query Parameters:**
- `lat` (float, required): Latitude
- `lng` (float, required): Longitude
- `max_distance_km` (float, optional, default 15.0): Maximum radius in km

---

## 6. Environmental Data Pipeline Audit
### `GET /api/v1/environmental-data/{water_body_id}`
Audits the availability and provenance of the 6 core environmental dimensions (rainfall, water level, water body type, terrain/elevation, historical hazard incidents, observation metadata).

---

## 7. River Telemetry & Historical Series
### `GET /api/v1/river-data/{station_query}`
Fetches current river telemetry status (`LIVE`, `HISTORICAL`, `CACHED`, or `UNAVAILABLE`).

### `GET /api/v1/river-data/history/{station_name}`
Returns sequential historical observations (stage in meters and discharge in m³/s) from verified telemetry records.

### `GET /api/v1/river-data/forecast-vs-observation/{station_name}`
Compares sequential 1-hour ML Ridge forecasts against actual ground-truth observations ($wl_{t+1}$), computing Model MAE vs. Baseline Persistence MAE.

---

## 8. Hydrodynamic Stage Forecasting
### `POST /api/v1/forecast/water-level`
Calculates an experimental 1-hour-ahead river water level (stage height in metres) using a trained Ridge regression model and 25 hydrodynamic momentum features.

---

## 9. Emergency Alerting Infrastructure
### `POST /api/v1/alerts/dispatch`
Dispatches an emergency alert via Webhook or SMTP Email, respecting safe test mode and deduplication windows.

### `POST /api/v1/alerts/test`
Sends an authorized test notification to verify integration connectivity.

### `GET /api/v1/alerts/deliveries`
Returns the SQLite durable delivery audit log.

### `GET /api/v1/alerts/status`
Returns configuration status of Webhook and SMTP channels.

---

## 10. Automated Hazard Monitoring
### `POST /api/v1/monitoring/evaluate`
Executes an immediate hazard evaluation sweep over monitored stations, checking for stage surges ($\Delta h \ge 0.15\text{ m}$), flow breaches ($\ge 6.0\text{ m}^3\text{/s}$), and risk score thresholds ($\ge 60.0$).

### `GET /api/v1/monitoring/status`
Returns background scheduler status, configured thresholds, and recent evaluations.

### `POST /api/v1/monitoring/start`
Starts the periodic background evaluation scheduler thread.

### `POST /api/v1/monitoring/stop`
Stops the periodic background evaluation scheduler thread.

---

## 11. Error Responses
All endpoints return standard RFC-7807 compatible error payloads:

```json
{
  "detail": [
    {
      "loc": ["body", "water_temp_c"],
      "msg": "Input should be greater than or equal to -5.0",
      "type": "greater_than_equal"
    }
  ]
}
```

