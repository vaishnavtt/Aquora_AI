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

## 5. Error Responses
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
