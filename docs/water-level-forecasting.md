# AQUORA AI — Experimental River Water-Level Forecasting

> **Important Hydrological & Ethics Notice:**  
> This pipeline is an **experimental one-hour-ahead river water-level (stage) forecasting research component**.  
> - It does **not** predict drowning incidents or human submersion outcomes.  
> - It does **not** invent arbitrary flood safety thresholds.  
> - It is **not** a validated public early warning system.  
> - Telemetry observations in `rwl_tel_hr_kerala_sw_999_2021_2025.csv` are **historical monitoring records from 2021–2025** collected by the Kerala State Water Resources Department (`Kerala SW`), **not live real-time streams**.  
> - It operates independently of the operational `AquaticRiskPredictor` and does not alter existing backend REST API contracts or database schemas.

---

## 1. Dataset Provenance

- **Source File:** `data/raw/rwl_tel_hr_kerala_sw_999_2021_2025.csv`
- **Originating Agency:** Kerala State Water Resources Department (`Kerala SW`)
- **Station Name:** `RAMAMANGALAM BRIDGE`
- **District:** `ERNAKULAM`, Kerala, India
- **Coordinates:** Latitude `9.866667° N`, Longitude `76.516667° E`
- **Measurement:** River water level telemetry in metres (m)
- **Total Raw Records for Station:** 21,230 observations spanning `2021-06-09 11:40` to `2025-03-10 08:30`.

---

## 2. Data-Cleaning & Preprocessing Decisions

1. **Sub-Hourly Telemetry Sampling Resolution:**  
   Although the column name is labeled `River Water Level Telemetry Hourly (meter)`, examination of raw timestamps revealed that observations arrive predominantly at sub-hourly intervals:
   - 30-minute intervals: 17,459 transitions (82.2%)
   - 60-minute intervals: 3,370 transitions (15.9%)
   - Irregular / gap intervals: 401 transitions (1.9%)
2. **Duplicate Handling:**  
   Exact timestamp duplicates were audited; 0 duplicate timestamp collisions were detected for this station.
3. **Data Type and Validity Verification:**  
   All 21,230 readings were verified as valid positive floats with zero NaNs, nulls, or negative numbers (range: `2.161 m` to `13.761 m`, mean: `7.474 m`).

---

## 3. Missing-Data & Telemetry Gap Handling

Real-world hydrological telemetry suffers from operational shutdowns, power outages, and seasonal monitoring breaks:

1. **The 540-Day Statewide Suspension:**  
   From **2022-11-25 15:00** to **2024-05-19 00:00** (~12,969 hours / 540.4 days), telemetry was suspended statewide across Kerala.
2. **Strict Non-Interpolation Rule:**  
   **No interpolation is ever performed across multi-day or seasonal gaps.** Bridging a 540-day or multi-week outage with synthetic interpolation would corrupt time-series dynamics and produce invalid training signals.
3. **Continuous Segment Segmentation:**  
   The time series is partitioned into discrete continuous observation segments whenever a transmission gap exceeds **3.0 hours**.
4. **Intra-Segment Hourly Resampling:**  
   Within each valid continuous segment of duration $\ge 16$ hours:
   - Observations are aggregated to a uniform 1-hour grid using the hourly mean: `resample('1h').mean()`.
   - Small isolated transmission dropouts of at most **2 consecutive missing hours** within an active segment are linearly interpolated: `interpolate(method='linear', limit=2)`.
   - Boundaries: The first 12 hours of each segment are dropped (as lag-12 history is building up), and the final hour of each segment is dropped (as the $t+1$ target lies across the gap boundary).
5. **Yield:** This protocol produced **91 continuous observation segments** containing **11,118 clean hourly feature-target samples** with zero cross-gap leakage.

---

## 4. Forecasting Target Definition

The task is **one-hour-ahead river water-level forecasting**:
$$\text{Target: } y_{t+1} = \text{WL}_{t+1} \text{ (in metres)}$$

### Modeling Strategy: Direct Level vs. Residual Delta
Rivers exhibit high inertia and strong autocorrelation over short intervals, meaning the latest observed level $\text{WL}_t$ is already close to $\text{WL}_{t+1}$. 
- If a machine learning model is trained to predict the raw absolute level directly, non-stationary seasonal shifts between years (e.g., 2021 reaching `13.76 m` vs. 2024 peaking at `6.55 m`) cause tree models to fail out-of-sample because decision trees cannot extrapolate beyond the min/max values seen during training.
- To achieve stationarity, the model is formulated as a **residual delta forecaster**:
  $$\Delta y_{t+1} = \text{WL}_{t+1} - \text{WL}_t$$
  $$\hat{y}_{t+1} = \text{WL}_t + \widehat{\Delta y}_{t+1}$$
The ML regressor learns the rate of rise or fall ($\widehat{\Delta y}_{t+1}$) based on dynamic lag tendencies, and adds it back to the current water level.

---

## 5. Model Feature Definitions & Validation Rules

At current time step $t$, exactly **25 features** are computed strictly from past observations $[t-12, \dots, t]$:

| Feature Category | Features | Description |
| :--- | :--- | :--- |
| **Current State** | `wl_t` | Latest observed water level at time $t$ |
| **Historical Lags** | `lag_1h`, `lag_2h`, `lag_3h`, `lag_6h`, `lag_12h` | Water level at $t-1, t-2, t-3, t-6, t-12$ hours |
| **Rate of Change (Deltas)** | `delta_1h`, `delta_2h`, `delta_3h`, `delta_6h`, `delta_12h` | Velocity and acceleration: $\text{WL}_t - \text{WL}_{t-k}$ |
| **Short-term Dynamics (3h)** | `roll_mean_3h`, `roll_std_3h` | Mean and sample standard deviation over $[t-2, t-1, t]$ |
| **Medium-term Dynamics (6h)**| `roll_mean_6h`, `roll_std_6h`, `roll_min_6h`, `roll_max_6h` | Window mean, volatility, and min/max envelope over 6 hours |
| **Longer-term Dynamics (12h)**| `roll_mean_12h`, `roll_std_12h`, `roll_min_12h`, `roll_max_12h` | Window mean, volatility, and min/max envelope over 12 hours |
| **Kinematic Curvature & Envelope** | `delta_accel_1h`, `delta_ratio_3h`, `relative_pos_6h`, `relative_pos_12h` | Stage acceleration $(\Delta y_t - \Delta y_{t-1})$, volatility ratio, and dynamic envelope position |

### Pre-Integration Input Validation Constraints:
1. **Minimum Length:** At least 13 observations are required to calculate lag-12 history.
2. **Strict Chronological Order:** Timestamps must be strictly ascending ($t_i > t_{i-1}$).
3. **Hourly Interval Tolerance:** The time delta between consecutive readings must be approximately 1 hour ($45.0 \le \Delta t \le 75.0\text{ minutes}$). Sub-hourly pings or multi-hour gaps are rejected.
4. **Physical Sanity Constraints on Water Level:**
   - Values must be finite real numbers (no `NaN`, `inf`, or string placeholders).
   - Negative readings are rejected ($\text{level} \ge 0.0\text{ m}$).
   - Values above $25.0\text{ m}$ are rejected. *Note:* The 25-metre ceiling is a provisional prototype sanity boundary (historical peak at this station is $13.76\text{ m}$) designed to trap corrupted sensor lines; it is not a verified physical spillway limit.

---

## 6. Time-Based Evaluation Protocol

To prevent future-lookahead data leakage, random k-fold cross-validation was strictly prohibited. Evaluation is strictly chronological:

1. **Training Set (5,612 samples):**  
   `2021-06-09 23:00` to `2022-07-30 10:00` (Monsoon 2021 through mid-2022).
2. **Validation Set (2,396 samples):**  
   `2022-08-02 00:00` to `2022-11-25 14:00` (Late 2022 Monsoon season).
3. **Out-of-Time Held-Out Test Set (3,103 samples):**  
   `2024-05-19 12:00` to `2024-10-04 08:00` (Monsoon 2024 season).  
   *Note:* The test set is completely separated from the training and validation sets by the 540-day telemetry hiatus.

---

## 7. Baseline Comparison & Actual Measured Metrics

### Baseline Definition:
The **Persistence Baseline** assumes the water level 1 hour ahead equals the current water level:
$$\hat{y}_{t+1} = \text{WL}_t$$

### Measured Performance Side-by-Side:

#### A. Out-of-Time Held-Out Test Set (2024 Monsoon — 3,103 samples)

| Model | MAE (m) | RMSE (m) | $R^2$ | Status vs. Baseline |
| :--- | :---: | :---: | :---: | :---: |
| **Persistence Baseline** | `0.017054` (~1.71 cm) | `0.028102` (~2.81 cm) | `0.998454` | Reference Benchmark |
| **RandomForestRegressor (Preserved Baseline)** | `0.011418` (~1.14 cm) | `0.017791` (~1.78 cm) | `0.999380` | Outperforms (+33.05% MAE, +36.69% RMSE) |
| **HistGradientBoostingRegressor (Delta)** | `0.011996` (~1.20 cm) | `0.019103` (~1.91 cm) | `0.999285` | Outperforms (+29.66% MAE, +32.02% RMSE) |
| **ExtraTreesRegressor (Delta)** | `0.011189` (~1.12 cm) | `0.017756` (~1.78 cm) | `0.999383` | Outperforms (+34.39% MAE, +36.82% RMSE) |
| **RidgeRegressor (Champion - Kinematic Delta)** | **`0.010390` (~1.04 cm)** | **`0.014528` (~1.45 cm)** | **`0.999587`** | **Champion (+39.08% MAE, +48.34% RMSE vs Base; +9.00% MAE, +18.34% RMSE vs RF)** |

#### B. Validation Set (Late 2022 Monsoon — 2,396 samples)

| Model | MAE (m) | RMSE (m) | $R^2$ |
| :--- | :---: | :---: | :---: |
| **Persistence Baseline** | `0.016926` | `0.027768` | `0.999200` |
| **RandomForestRegressor (Preserved)** | `0.011583` | `0.017962` | `0.999665` |
| **HistGradientBoostingRegressor (Delta)** | `0.012363` | `0.019351` | `0.999611` |
| **ExtraTreesRegressor (Delta)** | `0.011542` | `0.018122` | `0.999659` |
| **RidgeRegressor (Champion - Kinematic Delta)** | **`0.010788`** | **`0.015217`** | **`0.999760`** |

### Key Findings:
1. **The Persistence Baseline is exceptionally strong:** In a river basin of this scale, the average hourly change is only $\sim 1.7\text{ cm}$, giving the persistence baseline an $R^2$ of $0.9985$.
2. **Machine Learning Outperforms Persistence:** By capturing the rate of acceleration, lagged curvature, and multi-hour rolling volatility, the ML models beat persistence by over 30%.
3. **Why Ridge Regressor Demonstrably Outperforms Decision Trees:**
   - Over a 1-hour horizon, river surface slopes follow continuous momentum dynamics governed by differential hydrodynamic equations.
   - Decision trees (Random Forest, HistGradientBoosting) partition the space into discrete piecewise-constant steps, introducing quantization variance at the millimeter level (~1 cm).
   - L2-regularized linear modeling (Ridge) models smooth stage curvature and momentum directly, driving test MAE down to **1.04 cm** and test RMSE down to **1.45 cm** on unseen 2024 out-of-time telemetry (+18.3% RMSE improvement over Random Forest).
4. **Preservation of Existing Artifacts:** The prior trained Random Forest model is preserved at `backend/app/ml/models/ramamangalam_water_level_model_rf.joblib`.

## 8. Artifacts & Code Structure

- **Training Script:** [`backend/app/ml/train_water_level_forecaster.py`](file:///c:/Users/thott/Desktop/Aquora_AI/backend/app/ml/train_water_level_forecaster.py)
- **Forecaster Inference Module:** [`backend/app/ml/water_level_forecaster.py`](file:///c:/Users/thott/Desktop/Aquora_AI/backend/app/ml/water_level_forecaster.py)
- **Trained Model Artifact:** `backend/app/ml/models/ramamangalam_water_level_model.joblib`
- **Metrics JSON:** [`data/processed/ramamangalam_forecasting_metrics.json`](file:///c:/Users/thott/Desktop/Aquora_AI/data/processed/ramamangalam_forecasting_metrics.json)
- **Processed Hourly Features:** `data/processed/ramamangalam_hourly_features.csv`
- **Unit & Integration Tests:** [`backend/tests/test_water_level_forecaster.py`](file:///c:/Users/thott/Desktop/Aquora_AI/backend/tests/test_water_level_forecaster.py)

---

## 9. Limitations & Intended Use

1. **Short Horizon (1-hour):**  
   The model forecasts $t+1\text{ hour}$. Extending to longer multi-step horizons (e.g. 6h, 12h, 24h) without upstream catchment rainfall inputs will experience error compounding and diminishing advantage over persistence.
2. **Absence of Precipitation and Discharge Inputs:**  
   The raw CSV does not contain numerical rainfall or discharge (only water level and a static flag `Is_DischargeDataAvailable: No`). A sudden upstream flash flood surge caused by cloudbursts cannot be anticipated until the floodwave physically arrives at the sensor.
3. **No Flood Warning Claim:**  
   This model estimates physical water level (stage height) in metres. It does **not** estimate drowning likelihood, inundation extent, or official alert thresholds.
4. **Historical Telemetry Context:**  
   All benchmarks represent historical telemetry pings from Kerala SW, not live monitoring feeds.
5. **Integration Protocol:**  
   Kept completely isolated from the shared `backend/app/api/` routes and `backend/app/schemas/` to preserve teammate work until coordinated integration.

---

## 10. Future FastAPI Integration Guide for Backend Teammate

When the backend teammate begins implementing the API endpoint for water-level forecasting, they can integrate this module directly without modifying ML core code.

### Proposed Route: `POST /api/v1/forecast/water-level`

#### A. Proposed Pydantic Schemas
```python
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field

class HourlyReadingSchema(BaseModel):
    timestamp: datetime = Field(..., description="Observation timestamp in UTC")
    water_level_m: float = Field(..., ge=0.0, le=25.0, description="Stage height in metres")

class WaterLevelForecastRequest(BaseModel):
    station_name: str = Field(..., description="Target station (e.g., 'RAMAMANGALAM BRIDGE')")
    readings: List[HourlyReadingSchema] = Field(
        ..., min_length=13, description="At least 13 consecutive hourly telemetry observations"
    )

class WaterLevelForecastResponse(BaseModel):
    station: str
    district: str
    forecast_horizon: str
    latest_observation_timestamp: str
    forecast_target_timestamp: str
    current_water_level_m: float
    persistence_baseline_m: float
    predicted_delta_m: float
    forecasted_water_level_m: float
    rate_of_change_trend: str
    model_type: str
    is_experimental: bool
    notice: str
```

#### B. Proposed Endpoint Implementation Pattern
```python
from fastapi import APIRouter, HTTPException
from app.ml.water_level_forecaster import WaterLevelForecaster

router = APIRouter()
forecaster = WaterLevelForecaster()

@router.post("/forecast/water-level", response_model=WaterLevelForecastResponse, tags=["Forecasting"])
def forecast_water_level(payload: WaterLevelForecastRequest):
    if payload.station_name.strip().upper() != "RAMAMANGALAM BRIDGE":
        raise HTTPException(
            status_code=400,
            detail=f"Forecasting is currently calibrated only for 'RAMAMANGALAM BRIDGE'; got '{payload.station_name}'."
        )
    try:
        raw_readings = [
            {"timestamp": r.timestamp, "water_level_m": r.water_level_m}
            for r in payload.readings
        ]
        result = forecaster.predict_from_timestamped_readings(raw_readings)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Inference error: {str(e)}")
```

#### C. Expected Error Statuses
- `400 Bad Request`: Fewer than 13 readings, non-consecutive intervals ($\Delta t \notin [45, 75]\text{ mins}$), or non-chronological order.
- `422 Unprocessable Entity`: Schema/type validation errors (e.g. string passed instead of float, or negative numbers).
- `503 Service Unavailable`: Model artifact missing on disk.
