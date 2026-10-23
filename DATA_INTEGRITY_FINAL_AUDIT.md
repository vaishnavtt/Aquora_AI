# AQUORA AI — FINAL DATA INTEGRITY AND FALLBACK AUDIT REPORT

**Audit Date:** October 24, 2026  
**Audited Directory:** `C:\Users\thott\Desktop\Aquora_AI`  
**Git Branch:** `main` (commit: `88cbd44`)  
**Status:** ALL AUDITS, REPAIRS, REGRESSION TESTS, AND BROWSER VERIFICATIONS PASSED

---

## 1. Executive Summary & Objective

The **Aquora AI Final Data Integrity and Fallback Audit** was conducted to identify, eradicate, and prevent deceptive or synthetic fallback expressions across the operational dashboard, geospatial maps, location directories, hydrological simulators, historical trajectory charts, forecasts, and risk cards.

Prior browser and code audits identified several defensive fallback patterns that inadvertently substituted fabricated values for missing physical observations (e.g., substituting `0` for missing river stage, defaulting unrated baseline risk scores to `47` or `92`, or deriving water velocity using uncalibrated multipliers such as `flow_rate_cms * 0.4`). While these expressions prevented JavaScript runtime crashes, they presented synthetic numbers as real environmental measurements and distorted risk assessments.

This audit established strict scientific data integrity principles:
1. **Zero Invented Measurements:** Never substitute `0`, arbitrary defaults, or uncalibrated multipliers for unknown physical observations.
2. **Taxonomic Separation:** Strictly distinguish **Actual Measurements**, **Derived Estimates**, **Default Configurations**, **Missing Data**, and **Hypothetical Simulation Results**.
3. **Explicit Missing States:** When sensors are offline or telemetry is unrecorded, render honest, non-misleading states (`"Unavailable"`, `"Not Monitored"`, `"Unrecorded"`, `"No observation"`, `"Unrated"`).
4. **Transparent Risk Calculations:** If baseline telemetry or risk scores are absent, the system explicitly marks them as unrated and prevents deceptive simulation deltas.
5. **Crash-Resistant Null Handling:** Preserve robust defensive coding without resorting to fake numeric defaults.

---

## 2. Categorization & Data Distinction Taxonomy

To ensure scientific honesty across all frontend panels and backend APIs, data points are categorized according to the following taxonomy:

| Category | Definition | Rendering / Formatting Rule | Example in Aquora AI |
| :--- | :--- | :--- | :--- |
| **Actual Measurement** | Telemetry directly collected by physical sensors or observed stations. | Number with verified units and sensor timestamps. | River stage: `2.41 m`, Temp: `24.2 °C` |
| **Derived Estimate** | Hydrological or ML calculations derived from calibrated, documented formulas. | Labeled with model provenance, confidence interval, and validation source. | ML Ensemble Risk Score `75/100 (HIGH)` with 92% confidence |
| **Default Configuration** | Fixed operational presets (e.g., standard threshold lines or default alert rules). | Explicitly marked as operational baseline; never presented as telemetry. | Safe threshold: `3.00 m`, Alert threshold: `4.50 m` |
| **Missing / Unknown Data** | Sensors offline, uncalibrated water bodies, or unmonitored metrics. | Honest textual placeholders (`"—"`, `"Unavailable"`, `"Not Monitored"`, `"No observation"`). | Flow velocity on quarry lakes: `"Not Monitored"` |
| **Hypothetical Simulation** | User-adjusted scenario outputs from the What-If simulation engine. | Clearly distinguished from baseline; displays delta relative to calibrated baseline. | Rain scenario `+75 mm` -> Simulated Risk `100/100` (`+25 pts`) |

---

## 3. Audited Components & Code Repairs

Every component identified in the audit was inspected and refactored to eliminate synthetic defaults:

### 3.1 `ExposureRiskPanel.tsx` (`frontend/src/components/ops/ExposureRiskPanel.tsx`)
- **Synthetic Fallbacks Removed:**
  - `water_temp_c ?? 24.2`
  - `rainfall_mm ?? 18.5`
  - `rainfall_intensity ?? 'Heavy'`
  - `humidity_pct ?? 88`
  - `flow_rate_cms * 0.4` (unsupported velocity multiplier)
  - `current_water_level_m ?? depth_meters ?? 0`
  - Hardcoded model calibration metrics: `94.2%`, `84.0%`, `96.7%`
  - Default gauge score: `50`
- **Repaired Behavior:**
  - Missing rainfall renders `"Unrecorded"`.
  - Missing water temperature renders `"Unavailable"`.
  - Missing humidity renders `"Unavailable"`.
  - Missing flow velocity renders `"Not Monitored"`.
  - Uncalibrated model evidence renders `"Normal: Uncalibrated"` rather than fake percentages.
  - Gauge receives `null` when risk score is unrated, rendering `"—"` and `"UNRATED"`.

### 3.2 `RestrainedGauge.tsx` (`frontend/src/components/ops/RestrainedGauge.tsx`)
- **Synthetic Fallbacks Removed:**
  - Defaulting missing `score` to `0` or `50`.
  - Fabricating confidence when missing.
- **Repaired Behavior:**
  - Extended prop interface to accept `score: number | null | undefined` and `confidence?: number | null`.
  - When `score` is nullish or invalid:
    - Central display shows `"—"`.
    - Badge displays `"UNRATED"`.
    - Confidence label displays `"Confidence: Unavailable"`.
    - Arc stroke renders an empty track (`strokeDasharray: "0 1000"`).

### 3.3 `AllLocationsDirectory.tsx` (`frontend/src/components/ops/AllLocationsDirectory.tsx`)
- **Synthetic Fallbacks Removed:**
  - Depth heuristic: `st.depth_meters * 0.7`
  - Velocity heuristic: `st.flow_rate_cms * 0.4`
- **Repaired Behavior:**
  - Flow rate displays `"Not Monitored"` if telemetry is unavailable.
  - Hydraulic state renders `"Normal: Uncalibrated"` when physical dimensions lack calibrated cross-sections.
  - Added safe fallback `waterBodies = []` on data destructuring to prevent runtime crashes.

### 3.4 `OperationalWhatIfPanel.tsx` (`frontend/src/components/ops/OperationalWhatIfPanel.tsx`)
- **Synthetic Fallbacks Removed:**
  - Fallback risk score: `selectedStation?.current_risk_score ?? selectedStation?.risk_score ?? 47`
  - Fallback water temperature: `selectedStation?.water_temp_c ?? 24.0`
- **Repaired Behavior:**
  - Evaluates whether `baselineScore` is a valid finite number.
  - If baseline risk score is missing:
    - Baseline card renders `"—"` with badge `"UNRATED"`.
    - Simulated card renders `"—"` with badge `"UNRATED"`.
    - Delta badge displays `"Unavailable"`.
    - Simulation explanation displays: `"Baseline risk score is unrated for this station. Environmental delta simulation requires a calibrated baseline observation."`
  - Added `useEffect` hook to synchronize temperature slider to the station's actual observed temperature when switching stations.

### 3.5 `OperationsMap.tsx` (`frontend/src/components/ops/OperationsMap.tsx`)
- **Synthetic Fallbacks Removed:**
  - `station.current_water_level_m ?? station.depth_meters ?? 0`
  - `station.risk_score ?? 0`
  - `station.latitude ?? 0` / `station.longitude ?? 0`
- **Repaired Behavior:**
  - Map popup displays `Water Stage: No observation` when stage telemetry is absent.
  - Risk score displays `Unrated` when absent.
  - Validates coordinate bounds before rendering Leaflet markers; skips invalid coordinates without placing pins at `[0, 0]`.

### 3.6 `RiskHistoryChart.tsx` (`frontend/src/components/ops/RiskHistoryChart.tsx`)
- **Synthetic Fallbacks Removed:**
  - Synthetic trajectory baseline: `selectedStation?.current_risk_score ?? 92`
  - Arbitrary stage: `selectedStation?.current_water_level_m ?? 4.82`
  - In tooltip: `Number(p.stage || 0)`
- **Repaired Behavior:**
  - If `baseScore` is null or undefined, the component renders an honest unavailable state banner: `"Historical trajectory unavailable (Station risk score is unrated)"`.
  - Tooltip checks whether stage exists: if present, formats as `${p.stage.toFixed(2)} m`; if absent, formats as `No observation`.

### 3.7 `WhatIfSimulationPanel.tsx` (`frontend/src/components/WhatIfSimulationPanel.tsx`)
- **Synthetic Fallbacks Removed:**
  - Default station: `water_body_id ?? 7`
  - Stage default: `?? '2.50'`
  - Rain default: `?? '15.0'`
- **Repaired Behavior:**
  - Displays `"Unavailable"` when telemetry fields are missing from the selected water body.

### 3.8 `DrowningRiskAssessmentCard.tsx` (`frontend/src/components/DrowningRiskAssessmentCard.tsx`)
- **Synthetic Fallbacks Removed:**
  - `elevation_m ?? 15.0`
  - `delta_3h ?? '0.00 m'`
  - `rainfall ?? '15.0 mm'`
- **Repaired Behavior:**
  - Displays explicit `"Unavailable"` text in diagnostic telemetry rows when elevation, 3-hour delta, or rainfall are unmonitored.

### 3.9 `LocationDetailsPanel.tsx` (`frontend/src/components/LocationDetailsPanel.tsx`)
- **Null Safety Guard Repairs:**
  - Added optional chaining and null checks to `station.water_temp_c`, `station.flow_rate_cms`, `station.depth_meters`, and pipeline audit records (`pipelineAudit.current_water_level_m`).
  - Formats physical telemetry strictly when present; displays `"—"` or `"Not Monitored"` otherwise.

### 3.10 `DatasetModelStatusPanel.tsx` (`frontend/src/components/DatasetModelStatusPanel.tsx`)
- **Synthetic Metrics Removed:**
  - Fictional accuracy metric: `0.9784`
  - Fictional precision metric: `0.9992`
  - Fictional recall metric: `0.0106`
  - Fictional F1 metric: `0.8907`
  - Fictional AUC metric: `0.2322`
  - Fictional cross-validation metric: `0.9667`
  - Fictional test split metric: `0.0235`
- **Repaired Behavior:**
  - Displays `"Pending"` for training/evaluation metrics when model telemetry or benchmark datasets have not been evaluated.

### 3.11 `RiskPredictorCard.tsx` (`frontend/src/components/RiskPredictorCard.tsx`)
- **Synchronization Fix:**
  - Added a `useEffect` synchronization hook listening to `selectedWaterBody` changes to populate manual input fields strictly with observed telemetry, clearing unmonitored inputs rather than carrying over stale values.

### 3.12 `App.tsx` (`frontend/src/App.tsx`)
- **Synthetic Fallbacks Removed:**
  - In location selection cards: `(wb.water_temp_c || 0).toFixed(1)`
  - In location score display: `(wb.risk_score || ... || 0)`
- **Repaired Behavior:**
  - Displays temperature if finite, else `"Unavailable"`.
  - Displays risk score if finite, else `"(Unrated)"`.

### 3.13 `hazard_monitoring_service.py` (`backend/app/services/hazard_monitoring_service.py`)
- **Synthetic Fallbacks Removed:**
  - `flow_cms = telemetry.flow_rate_cms or 0.0`
  - Falsely claiming "missing or zeroed" when flow was unmonitored.
  - Reporting `observed_flow_cms=0.0` in evaluation results when velocity was unmeasured.
- **Repaired Behavior:**
  - Preserves `flow_cms` as `Optional[float]`.
  - Evaluates physical flow bounds and flow breach triggers only when flow is actually measured.
  - Outputs `observed_flow_cms=None` when unmeasured, eliminating fabricated zero readings.

### 3.14 `drowning_risk_service.py` (`backend/app/services/drowning_risk_service.py`)
- **Synthetic Fallbacks Removed:**
  - `base_wl = baseline.layer_a_environmental_hazard.water_level_m or 2.5`
  - `base_dis = baseline.layer_a_environmental_hazard.estimated_discharge_cms or 12.0`
- **Repaired Behavior:**
  - In `simulate_what_if`, unmeasured baseline water level and discharge preserve `None` in the simulated assessment rather than fabricating `2.5 + delta` or `12.0 + delta`.

### 3.15 `OperationalWhatIfPanel.tsx` (`frontend/src/components/ops/OperationalWhatIfPanel.tsx`)
- **Misleading Note Removed:**
  - Removed claim that "Model inference updates on every slider adjustment using calibrated Kerala Random Forest hydro-coefficients."
- **Repaired Behavior:**
  - Explicitly documents the linear heuristic sensitivity stress-test model (+0.22/mm rain, +14.5/m stage, +0.18/m³/s discharge, cold shock factor, crowd exposure offset; clamped 5–100) and clarifies that it is an exploratory operational scenario simulation tool, not a certified hydrodynamic forecast or individual drowning probability.

---

## 4. Regression Test Suite Verification

Seven dedicated regression tests in `frontend/src/__tests__/components.test.tsx` and three new backend regression tests in `backend/tests/test_risk_engine_and_monitoring.py` continuously protect against data regression:

1. **`RestrainedGauge renders honest unrated state when score is null`**: Verifies that passing `score={null}` renders `"—"`, the badge `"UNRATED"`, and confidence `"Confidence: Unavailable"` with zero arc fill.
2. **`OperationalWhatIfPanel disables simulation and explains when baseline score is unrated`**: Verifies that when a station has `current_risk_score: null`, the panel displays baseline `"—"`, simulated `"—"`, delta `"Unavailable"`, and the explanation banner.
3. **`ExposureRiskPanel renders honest unavailable telemetry labels instead of synthetic fallbacks`**: Verifies that passing a station with null telemetry renders `"Unrecorded"` for rainfall, `"Unavailable"` for temperature/humidity, `"Not Monitored"` for velocity, and `"Normal: Uncalibrated"`.
4. **`AllLocationsDirectory renders uncalibrated and not-monitored states instead of multiplier fallbacks`**: Verifies that unmonitored flow rate displays `"Not Monitored"` rather than multiplying by `0.4`.
5. **`RiskHistoryChart displays honest unavailable state when risk score is unrated`**: Verifies that a station with `current_risk_score: null` displays the trajectory unavailable banner instead of generating a fake graph starting at `92`.
6. **`RiskHistoryChart tooltip renders "No observation" when stage is undefined`**: Verifies that custom tooltip rendering displays `"No observation"` rather than `0.00 m`.
7. **`OperationalWhatIfPanel displays explicit experimental disclaimer and sensitivity calculations`**: Verifies honest stress-test disclaimer text.
8. **Backend: `test_unmeasured_flow_rate_preserved_as_none_not_zero`**: Asserts observed flow rate preserves None.
9. **Backend: `test_both_stage_and_flow_missing_detected_as_anomaly`**: Asserts anomaly detection when stage and flow are absent.
10. **Backend: `test_what_if_simulation_unmeasured_baseline_does_not_fabricate_stage`**: Asserts unmeasured stage/discharge baseline is not fabricated in simulations.

### Test Execution Summary:
```bash
# 1. Frontend Vitest Suite
npm test -- --run
Result: 2 test files passed, 34/34 tests passed (100%)

# 2. TypeScript & Production Build
npm run build (tsc -b && vite build)
Result: Built in 16.99s, 0 TypeScript errors, production bundle generated

# 3. Backend Pytest Suite
.\backend\.venv\Scripts\python -m pytest
Result: 182 passed, 33 warnings in 27.22s (100%)

# 4. Database Migrations
.\backend\.venv\Scripts\alembic current
Result: dfd0da3e179f (head) (Up to date)
```

---

## 5. Live Browser Verification & QA Results

Live interactive browser testing was executed at `http://localhost:5173/` using automated browser sessions.

### 5.1 Verification Checklist:
- [x] **Operations Desk Overview:** No NaN values, no zeroed telemetry cards, clean rendering.
- [x] **Meenmutty Waterfalls Station (Sparse Telemetry Case):**
  - Score displayed: `75/100` (`HIGH`).
  - Rainfall: Honestly displayed as `"Unrecorded"` (no `18.5 mm` fallback).
  - Temperature: Honestly displayed as `19.5 °C`.
  - Humidity: Honestly displayed as `"Unavailable"` (no `88%` fallback).
  - Flow Velocity: Honestly displayed as `"Not Monitored"` (no `flow_rate_cms * 0.4` multiplier).
  - Cross-section Model Evidence: Honestly displayed as `"Normal: Uncalibrated"`.
- [x] **Operational What-If Simulator:**
  - Adjusting rainfall slider by `+75 mm` simulated a live risk jump to `100/100 EXTREME` (`+25 pts`) dynamically.
  - Reset to `0 mm` returned simulated risk to baseline `75/100`.
- [x] **Map Popups & Markers:**
  - Clicking map pins displayed honest popups (`Water Stage: No observation` for unmonitored stations).
- [x] **Browser Console & Network Audit:**
  - 0 uncaught exceptions.
  - 0 React rendering crashes.
  - Clean API responses with HTTP 200.

### 5.2 Recorded Artifacts:
- **Browser Session Recording:** `file:///C:/Users/thott/.gemini/antigravity-ide/brain/9aab1456-8231-42e9-9b7d-7cd44392539d/all_locations_and_history_qa_1792783789738.webp`
- **Exposure Risk Panel Screenshot:** `file:///C:/Users/thott/.gemini/antigravity-ide/brain/9aab1456-8231-42e9-9b7d-7cd44392539d/exposure_risk_panel_1792784019033.png`
- **What-If Simulation Interactive Screenshot:** `file:///C:/Users/thott/.gemini/antigravity-ide/brain/9aab1456-8231-42e9-9b7d-7cd44392539d/operational_what_if_panel_1792784005848.png`

---

## 6. Operational Limitations & Scientific Disclaimers

1. **Cross-Section Calibration:** Uncalibrated water bodies lack bathymetric cross-section models. While discharge (`cms`) may be estimated from upstream dams, local velocity (`m/s`) cannot be calculated without survey data. Aquora AI will continue to display `"Not Monitored"` for velocity until bathymetric calibration is completed.
2. **Sparse Telemetry Stations:** Certain remote water bodies only report rainfall or stage intermittently. For these locations, baseline risk is derived strictly from available static topographic and seasonal parameters; missing dynamic parameters are transparently noted as `"Unrecorded"`.
3. **What-If Simulation Prerequisite:** Simulations require an established baseline risk assessment. Stations marked as `"UNRATED"` cannot run what-if simulations until an initial baseline assessment is conducted.

---

**Audit Sign-off:**  
Senior Full-Stack Developer, ML Engineer & QA Specialist  
Aquora AI Project Team
