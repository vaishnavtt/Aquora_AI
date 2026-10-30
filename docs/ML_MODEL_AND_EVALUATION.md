# AQUORA AI — Machine Learning Model & Evaluation Report

**Task:** 1-Hour-Ahead River Water-Level (Stage) Forecasting  
**Authoritative Algorithm:** scikit-learn Ridge Regression with Kinematic Delta Feature Engineering  
**Scope:** Kerala Hydrological Basin Gauge Stations  
**Model Directory:** `backend/app/ml/models/`

---

## 1. Objective & Scientific Scope

> [!IMPORTANT]
> **Scientific & Safety Boundary:**
> AQUORA AI's machine-learning subsystem forecasts **river stage in meters ($h_{t+1}$)** one hour ahead. It **does NOT predict individual drowning occurrences**, nor does it compute a calibrated probability of drowning. All hydrodynamic and recreational hazard levels derived from stage predictions are heuristic decision-support indicators, not drowning guarantees.

The purpose of the ML forecaster is to predict short-term river stage fluctuations, providing early detection of sudden runoff spikes, flash-flood pulses, and kinematic wave crests across Kerala river basins.

---

## 2. Model Architecture & Feature Engineering

### 2.1 Model Specification
- **Estimator:** `sklearn.linear_model.Ridge(alpha=100.0, fit_intercept=True)`
- **Regularization:** L2 regularization prevents overfitting on seasonal collinearities while retaining physical kinematic momentum weights.
- **Serialization:** Pre-trained binary artifacts persisted using `joblib` in `backend/app/ml/models/`:
  - `model_ramamangalam_ridge.joblib`
  - `model_pala_ridge.joblib`
  - `model_trinayakudam_ridge.joblib`

### 2.2 Input Feature Representation (25 Features)
The forecaster strictly requires 13 consecutive hourly water level readings ($t-12$ to $t_0$, spaced 45–75 minutes apart) and computes:
1. **Level Lags (13 features):** `h_t0, h_t1, h_t2, ..., h_t12` representing stage history.
2. **First-Order Kinematic Deltas (11 features):** $\Delta h_k = h_{t-k} - h_{t-(k+1)}$ representing flow rate velocity vectors.
3. **Acceleration Term (1 feature):** $\Delta^2 h = \Delta h_0 - \Delta h_1$ representing immediate kinematic acceleration.

### 2.3 Strict Feature Alignment in Inference
Inference uses the exact feature names and ordering matching the training pipeline:
```python
feat_df = pd.DataFrame([features_dict])[forecaster.feature_names]
forecast_m = float(forecaster.model.predict(feat_df)[0])
```
Passing labeled DataFrames suppresses scikit-learn unlabelled array warnings and prevents feature order mismatch errors.

---

## 3. Empirical Evaluation & Held-Out Test Results

The models were evaluated against an independent held-out test split (last 20% of chronological observations) and compared directly against a **Persistence Baseline** ($\hat{h}_{t+1} = h_t$).

### 3.1 Performance Metrics Table
| Gauge Station | River Basin | Model MAE (m) | Persistence MAE (m) | MAE Reduction (%) | Model RMSE (m) | $R^2$ Score | Held-Out Sample Size ($N$) |
|:---|:---|:---:|:---:|:---:|:---:|:---:|:---:|
| **Ramamangalam Bridge** | Muvattupuzha | **0.0347** | 0.0573 | **+39.4%** | **0.0461** | **0.9842** | 3,420 hours |
| **Pala** | Meenachil | **0.0315** | 0.0385 | **+18.1%** | **0.0418** | **0.9810** | 2,890 hours |
| **Trinayakudam** | Muvattupuzha Lower | **0.0302** | 0.0336 | **+10.1%** | **0.0395** | **0.9875** | 3,110 hours |

### 3.2 Evaluation Interpretation
- At **Ramamangalam Bridge**, the Ridge model achieves a **39.4% improvement** in MAE over persistence, accurately predicting sharp runoff crests and post-peak stage recession.
- At **Pala** (upstream mountain catchment), the model improves accuracy by **18.1%**, capturing antecedent basin memory.
- At **Trinayakudam** (lowland tidal transition reach), the model improves accuracy by **10.1%**, filtering baseline tidal backwater oscillations.

---

## 4. Dam Barrage Safety Rejection: Maniyar Dam Case Study

> [!WARNING]
> **Hydrological Justification for Model Rejection:**
> Maniyar Dam Barrage is explicitly rejected from ML forecasting (`HTTP 422: Hydrological station 'MANIYAR DAM' is classified as an actively regulated reservoir barrage`).

### Empirical Evidence
When trained and tested on Maniyar Dam telemetry, kinematic regression models yielded:
- **Model $R^2$ Score:** **-8.53** (drastically worse than predicting the mean).
- **Model MAE:** 0.612 m vs Persistence MAE 0.142 m.

### Physical Reason
Maniyar Dam water levels are governed by **human mechanical sluice gate operations** (opening/closing gates based on upstream storage mandates) rather than natural kinematic wave routing. Statistical models lacking mechanical gate aperture telemetry produce dangerous, hallucinated forecasts. The platform safely rejects these stations with transparent explanatory warnings.

---

## 6. Layer A Environmental Hazard Classification Model

### 6.1 Objective & Scientific Guardrails
In addition to 1-hour-ahead stage forecasting, AQUORA AI deploys a supervised **Environmental Hazard Classification Model** to evaluate physical aquatic danger across Kerala gauge nodes.
- **Champion Algorithm:** `HistGradientBoostingClassifier` (Calibrated with `CalibratedClassifierCV`)
- **Persistence Artifact:** `backend/app/ml/models/environmental_hazard_model.joblib`
- **Benchmark Registry:** `backend/app/ml/models/hazard_model_evaluation_metrics.json`
- **Target Definition:** Physical hydraulic danger breach based on high stage surge ($\Delta h \ge 0.15\text{ m/h}$), extreme stage ($> 5.0\text{ m}$), or intense rainfall ($\ge 15\text{ mm/h}$).
- **Scientific Integrity Guardrail:** Explicitly states this model predicts **environmental aquatic hazard**, not individual human drowning occurrence.

### 6.2 Input Features (21 Dimensional Vectors)
1. Monitored stage: `water_level_m`
2. Temporal stage lags: `wl_lag_1h`, `wl_lag_3h`, `wl_lag_6h`, `wl_lag_12h`
3. Rate of change deltas: `wl_delta_1h`, `wl_delta_3h`, `wl_delta_6h`, `wl_delta_12h`
4. Stage acceleration: `wl_accel_1h`
5. Rolling statistics: `wl_roll_mean_6h`, `wl_roll_std_6h`
6. Antecedent precipitation: `rainfall_1h_mm`, `rainfall_3h_mm`, `rainfall_6h_mm`, `rainfall_12h_mm`, `rainfall_24h_mm`, `rainfall_48h_mm`
7. Physical basin context: `estimated_discharge_cms`, `elevation_m`, `is_monsoon_season`

### 6.3 Held-Out Out-of-Time Test Benchmark ($N = 8,038$ hourly records)
| Metric | Calibrated Champion Value | Baseline Benchmark |
| :--- | :---: | :---: |
| **Accuracy** | **98.76%** (0.9876) | 97.35% (Dummy Baseline) |
| **Precision** | **95.20%** (0.9520) | 0.00% |
| **Recall** | **55.87%** (0.5587) | 0.00% |
| **F1 Score** | **0.7041** | 0.0000 |
| **ROC-AUC** | **0.9903** | 0.5000 |
| **PR-AUC** | **0.8520** | 0.0265 |
| **Brier Calibration Score** | **0.0106** | 0.0265 |
| **Confusion Matrix** | `[[7819, 6], [94, 119]]` | — |

### 6.4 Spatial Generalization & Leak-Free Antecedent Benchmarks
- **Leave-One-Station-Out Cross-Validation:** Evaluated across all 5 monitored telemetry stations (Banglamkadavu, Pala, Ramamangalam Bridge, Vellur, Trinayakudam) to confirm spatial transferability across distinct drainage basins.
- **Leak-Free Antecedent Formulation:** Strict evaluation without simultaneous target formula columns confirms robust predictive skill from antecedent lags alone (ROC-AUC 0.8907).

