# AQUORA AI — Multi-Station Water-Level Forecasting Generalization Evaluation

**Project:** AQUORA AI  
**Branch:** `feature/multi-station-evaluation`  
**Base Commit:** `29aec97` (Merged main)  
**Date:** October 19, 2026  
**Document Owner:** Track 1 (ML & Hydrological Data Engineering)  

---

## 1. Executive Summary & Objective

The primary objective of this evaluation is to determine **whether the kinematic delta Ridge forecasting approach—originally developed for Ramamangalam Bridge—generalizes to other monitoring stations** in Kerala using only the data already available in the repository (`data/raw/rwl_tel_hr_kerala_sw_999_2021_2025.csv`).

### Critical Empirical Conclusion:
1. **Natural Open-Channel Rivers (Generalization Confirmed):**  
   The kinematic delta Ridge model **demonstrably generalizes** to natural, free-flowing, and midland river channels (`RAMAMANGALAM BRIDGE`, `PALA`, `TRINAYAKUDAM`), outperforming the persistence baseline by **10% to 39% MAE** and achieving sub-2.5 cm mean errors.
2. **Flashy Gorge / Barrage-Influenced Reaches (Non-Linear Partitioning Preferred):**  
   On flashy gorge channels with regulated headworks (`MALAYATTOOR KODANAD BRIDGE` on the Periyar River), non-linear tree models (`RandomForestRegressor`, MAE: `2.16 cm`) outperform linear Ridge regression (`4.73 cm`), because discrete tree partitions better absorb sharp step-function surge spikes.
3. **Dam Reservoirs and Barrages (Catastrophic Generalization Failure):**  
   The model **fails catastrophically** on dam reservoirs (`MANIYAR DAM`, $R^2 = -8.53$). Water stage behind dam structures is governed by human gate maneuvers rather than continuous open-channel kinematic wave propagation. **The river stage model must never be applied to dam reservoirs without mechanical gate telemetry.**
4. **Permanent Telemetry Truncation Finding:**  
   Our data audit discovered that **`MALAYATTOOR KODANAD BRIDGE` and `PALA` ceased recording on November 25, 2022**, and were never resumed in 2024. Therefore, out-of-time 2024 testing was conducted on full-span stations (`RAMAMANGALAM BRIDGE`, `MANIYAR DAM`, `TRINAYAKUDAM`), while Malayattoor and Pala were evaluated using an adaptive chronological held-out test window within their active 2021–2022 observation period.

---

## 2. Existing Model Verification (Ramamangalam Bridge)

We independently verified the existing Ramamangalam Bridge benchmark using the exact script parameters and raw CSV.

- **Station:** `RAMAMANGALAM BRIDGE`
- **Basin / District:** Muvattupuzha River basin / Ernakulam District
- **Total Raw Records:** 21,230 (deduped: 21,230, zero NaNs or unparseable timestamps)
- **Continuous Segments Formed:** 91 segments (11,118 clean hourly samples across gap threshold $\Delta t > 3.0\text{h}$)
- **Chronological Splits:**
  - **Train Set (5,612 samples):** `2021-06-09 23:00` to `2022-07-30 10:00` (Monsoon 2021 through mid-2022)
  - **Validation Set (2,396 samples):** `2022-08-02 00:00` to `2022-11-25 14:00` (Late 2022 Monsoon)
  - **Held-Out Test Set (3,103 samples):** `2024-05-19 12:00` to `2024-10-04 08:00` (Out-of-Time 2024 Monsoon, isolated by the 540-day hiatus)

### Ramamangalam Verification Benchmark Results:
| Model | Test MAE (m) | Test MAE (cm) | Test RMSE (m) | Test RMSE (cm) | $R^2$ Score | Status vs Persistence |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| **Persistence Baseline** | `0.017054` | 1.71 cm | `0.028102` | 2.81 cm | `0.998454` | Benchmark Reference |
| **RandomForestRegressor (Delta)** | `0.011418` | 1.14 cm | `0.017791` | 1.78 cm | `0.999380` | +33.05% MAE, +36.69% RMSE |
| **RidgeRegressor (Champion Delta)** | **`0.010390`** | **1.04 cm** | **`0.014528`** | **1.45 cm** | **`0.999587`** | **+39.08% MAE, +48.30% RMSE** |

The measured metrics reproduce the reported values in `ramamangalam_forecasting_metrics.json` with 100% precision.

---

## 3. Station Selection & Dataset Quality Findings

To rigorously test generalization, five stations across four distinct hydrological regimes were audited and evaluated:

| Station Name | District / River Basin | Hydrological Typology | Raw Rows | Date Range | 2024 Telemetry? | Selection Rationale |
|---|---|---|:---:|:---:|:---:|---|
| **`RAMAMANGALAM BRIDGE`** | Ernakulam / Muvattupuzha | Midland alluvial river | 21,230 | 2021-06-09 to 2025-03-10 | **YES** | Primary baseline & champion benchmark station. |
| **`MALAYATTOOR KODANAD BRIDGE`** | Ernakulam / Periyar | Flashy river gorge downstream of dam / barrage | 14,107 | 2021-06-09 to 2022-11-25 | **NO** | Selected per instructions to test major river (Periyar) in the same district. |
| **`PALA`** | Kottayam / Meenachil | Upper-midland river channel | 15,771 | 2021-06-05 to 2022-11-25 | **NO** | Selected per instructions to test neighboring district basin (Meenachil River). |
| **`MANIYAR DAM`** | Pathanamthitta / Pamba | Reservoir / barrage structure | 21,413 | 2021-05-31 to 2025-03-10 | **YES** | Added to test behavior on controlled hydraulic structures across the full 2021–2025 timeline. |
| **`TRINAYAKUDAM`** | Kottayam / Meenachil-Vembanad | Lowland backwater transition | 19,031 | 2021-06-06 to 2025-03-10 | **YES** | Added to test low-gradient tidal/backwater river reach with full 2024 test data. |

### Critical Dataset Quality Findings:

1. **Ramamangalam Bridge Coordinate Anomaly (Investigated & Confirmed):**
   - In the raw government CSV, `RAMAMANGALAM BRIDGE` has coordinates logged as **Latitude `10.899167° N`, Longitude `91.472500° E`**.
   - Longitude `91.4725° E` is physically located in Assam/Bay of Bengal, ~1,500 km away from Kerala.
   - The actual physical location of Ramamangalam Bridge in Ernakulam District is **Latitude `9.8667° N`, Longitude `76.5167° E`**.
   - *Investigation Verdict:* This is an isolated data-entry typo in the State Water Department database. Out of all 26 stations in the CSV, Ramamangalam is the **only station** with an erroneous coordinate. Per safety instructions, coordinates were **not silently modified** in the raw source dataset.
2. **Permanent Telemetry Truncation of Malayattoor Kodanad & Pala:**
   - On **November 25, 2022 at 15:00**, telemetry across Kerala was interrupted.
   - When telemetry was restored in May 2024, **8 of the 26 stations were never resumed**, including `MALAYATTOOR KODANAD BRIDGE` and `PALA`.
   - *Impact on Evaluation:* Evaluating Malayattoor and Pala using a static 2024 test window yields 0 samples. To enable a valid scientific evaluation without fabricating data, an adaptive chronological split within their active 2021–2022 span was established.
3. **Data Completeness & Zero-Interpolation Rule:**
   - Zero negative, null, or NaN water levels exist in any of the audited stations.
   - All multi-day gaps were strictly segmented; **no water levels were ever interpolated across large gaps**.

---

## 4. Evaluation Methodology

1. **Target Formulation:**
   - One-hour-ahead river water level: $y_{t+1} = \text{WL}_{t+1}$.
   - Modeled via residual kinematic delta: $\Delta y_{t+1} = \text{WL}_{t+1} - \text{WL}_t$.
   - Predicted stage: $\hat{y}_{t+1} = \text{WL}_t + \widehat{\Delta y}_{t+1}$.
2. **Feature Engineering (25 Features):**
   - State: `wl_t`
   - Lags: `lag_1h`, `lag_2h`, `lag_3h`, `lag_6h`, `lag_12h`
   - Deltas: `delta_1h`, `delta_2h`, `delta_3h`, `delta_6h`, `delta_12h`
   - Rolling Window: `roll_mean_3h`, `roll_std_3h`, `roll_mean_6h`, `roll_std_6h`, `roll_min_6h`, `roll_max_6h`, `roll_mean_12h`, `roll_std_12h`, `roll_min_12h`, `roll_max_12h`
   - Kinematic Dynamics: `delta_accel_1h`, `delta_ratio_3h`, `relative_pos_6h`, `relative_pos_12h`
3. **Chronological Splitting Strategies:**
   - **Full-Span Stations (`RAMAMANGALAM`, `MANIYAR DAM`, `TRINAYAKUDAM`):**
     - Train: `< 2022-08-01`
     - Validation: `2022-08-01` to `2022-11-25`
     - Out-of-Time Held-Out Test: `2024-05-19` to `2024-10-04` (Post-540d Hiatus)
   - **Truncated Stations (`MALAYATTOOR KODANAD`, `PALA`):**
     - Train: `< 2022-06-01` (~12 months)
     - Validation: `2022-06-01` to `2022-08-31` (Early Monsoon 2022)
     - Held-Out Test: `2022-09-01` to `2022-11-25` (Late Monsoon 2022)
4. **Zero-Shot Cross-Station Transfer Test:**
   - In addition to training station-specific models, the **Ridge model trained on Ramamangalam Bridge was applied directly to the test sets of the other stations without retraining**, testing whether kinematic delta weights transfer across basins.

---

## 5. Actual Evaluation Results

### A. Held-Out Test Set Performance (Side-by-Side Comparison)

| Station Name | Test Samples & Period | Model | MAE (cm) | RMSE (cm) | $R^2$ Score | Status vs Persistence |
|---|---|---|:---:|:---:|:---:|:---:|
| **RAMAMANGALAM BRIDGE** | 3,103 samples<br>(Monsoon 2024) | Persistence Baseline<br>RandomForestRegressor<br>**RidgeRegressor (Kinematic)** | 1.71 cm<br>1.14 cm<br>**1.04 cm** | 2.81 cm<br>1.78 cm<br>**1.45 cm** | 0.998454<br>0.999380<br>**0.999587** | Benchmark Reference<br>+33.05% MAE<br>**+39.08% MAE, +48.30% RMSE** |
| **MALAYATTOOR KODANAD** | 1,784 samples<br>(Late 2022 Monsoon) | Persistence Baseline<br>**RandomForestRegressor**<br>RidgeRegressor (Kinematic)<br>*Ramamangalam Zero-Shot* | 2.96 cm<br>**2.16 cm**<br>4.73 cm<br>2.52 cm | 7.29 cm<br>**5.13 cm**<br>5.99 cm<br>6.34 cm | 0.988954<br>**0.994526**<br>0.992531<br>0.991632 | Benchmark Reference<br>**+27.02% MAE, +29.63% RMSE**<br>-59.94% MAE, +17.77% RMSE<br>+14.87% MAE, +12.96% RMSE |
| **PALA** | 1,811 samples<br>(Late 2022 Monsoon) | Persistence Baseline<br>RandomForestRegressor<br>**RidgeRegressor (Kinematic)**<br>*Ramamangalam Zero-Shot* | 1.99 cm<br>1.61 cm<br>**1.78 cm**<br>1.74 cm | 5.65 cm<br>4.34 cm<br>**3.70 cm**<br>4.92 cm | 0.989099<br>0.993569<br>**0.995314**<br>0.991744 | Benchmark Reference<br>+19.10% MAE, +23.18% RMSE<br>**+10.15% MAE, +34.43% RMSE**<br>+12.22% MAE, +12.89% RMSE |
| **MANIYAR DAM** | 3,056 samples<br>(Monsoon 2024) | **Persistence Baseline**<br>RandomForestRegressor<br>RidgeRegressor (Kinematic)<br>*Ramamangalam Zero-Shot* | **12.72 cm**<br>26.05 cm<br>143.72 cm<br>15.75 cm | **19.36 cm**<br>31.69 cm<br>144.73 cm<br>23.14 cm | **0.829503**<br>0.543214<br>-8.530203<br>0.756424 | **Benchmark Reference**<br>-104.79% MAE (Degraded)<br>Catastrophic failure<br>-23.82% MAE (Degraded) |
| **TRINAYAKUDAM** | 2,880 samples<br>(Monsoon 2024) | Persistence Baseline<br>**RandomForestRegressor**<br>**RidgeRegressor (Kinematic)**<br>*Ramamangalam Zero-Shot* | 2.86 cm<br>**2.31 cm**<br>**2.31 cm**<br>2.62 cm | 4.06 cm<br>**3.62 cm**<br>3.84 cm<br>4.26 cm | 0.884792<br>**0.908803**<br>0.897176<br>0.873743 | Benchmark Reference<br>**+19.23% MAE, +10.84% RMSE**<br>**+19.16% MAE, +5.53% RMSE**<br>+8.45% MAE (-4.9% RMSE) |

---

### B. Validation Set Performance

| Station Name | Validation Samples & Period | Persistence MAE (cm) | Ridge MAE (cm) | Ridge MAE Improvement | Ridge $R^2$ |
|---|---|:---:|:---:|:---:|:---:|
| **RAMAMANGALAM BRIDGE** | 2,396 samples (Late 2022) | 1.69 cm | **1.08 cm** | **+36.26%** | `0.999760` |
| **MALAYATTOOR KODANAD** | 1,060 samples (Mid 2022) | 5.89 cm | **5.23 cm** | **+11.13%** | `0.997254` |
| **PALA** | 1,046 samples (Mid 2022) | 3.39 cm | **2.29 cm** | **+32.26%** | `0.998409` |
| **MANIYAR DAM** | 2,470 samples (Late 2022) | 15.36 cm | 22.84 cm | -48.70% (Degraded) | `0.997426` |
| **TRINAYAKUDAM** | 2,412 samples (Late 2022) | 2.82 cm | **2.09 cm** | **+25.89%** | `0.985652` |

---

## 6. Key Findings & Scientific Interpretations

### 1. Generalization Across Natural River Channels is Confirmed
On free-flowing or natural channel reaches (`Ramamangalam Bridge`, `Pala`, `Trinayakudam`), the kinematic delta modeling approach successfully generalizes:
- At **Pala** (Meenachil River), Ridge achieved **1.78 cm MAE** (34.4% RMSE reduction vs. persistence).
- At **Trinayakudam**, Ridge achieved **2.31 cm MAE** (19.2% MAE reduction vs. persistence).
- Interestingly, the **Zero-Shot Transfer of the Ramamangalam Ridge model** to Pala and Trinayakudam *without any retraining* also beat their local persistence baselines (+12.2% at Pala, +8.5% at Trinayakudam). This confirms that short-term open-channel river inertia shares universal dynamic momentum across natural Kerala basins.

### 2. Why Ridge Regressor Fails on Dam Barrages (Maniyar Dam)
At **Maniyar Dam**, water level fluctuates over a $33\text{-metre}$ dynamic range (`2.625m` to `35.731m`) due to reservoir filling, hydro-peaking, and floodgate operations.
- The Persistence Baseline achieved `12.72 cm` MAE.
- The Ridge Regressor exploded to `143.72 cm` MAE ($R^2 = -8.53$).
- *Hydrological Reason:* Sluice gate openings cause instantaneous multi-metre stage drops or surges independent of recent water curvature. The L2 regularized linear model interprets steep gate adjustments as high continuous acceleration, extrapolating dramatic surges that do not occur. **Dam telemetry requires discrete reservoir gate state variables, not open-channel kinematic lags.**

### 3. Non-Linear Tree Models Outperform Ridge on Regulated Gorges (Malayattoor)
At **Malayattoor Kodanad Bridge** on the Periyar River (downstream of Bhoothathankettu barrage):
- The `RandomForestRegressor` was the best-performing model, achieving **2.16 cm MAE** and **5.13 cm RMSE** (+27.0% MAE vs persistence).
- Station-trained Ridge had a higher MAE (`4.73 cm`), though it achieved a lower RMSE (`5.99 cm`).
- *Hydrological Reason:* The Periyar River experiences frequent pulse releases from upstream barrages. Decision trees partition state space into piecewise constant thresholds, cleanly capping sharp spikes without propagating excessive linear extrapolation error.

---

## 7. Limitations & Recommended Next Steps

1. **Station Classification Requirement:**  
   Before applying the forecasting model to any new telemetry station, stations must be categorized into:
   - *Natural / Alluvial River:* Use Ridge or Random Forest kinematic delta.
   - *Regulated Gorge:* Prefer `RandomForestRegressor`.
   - *Dam / Reservoir Structure:* Exclude from autoregressive forecasting until dam gate telemetry is available.
2. **Telemetry Resumption Disparity:**  
   Because stations like `MALAYATTOOR KODANAD` and `PALA` lack 2024–2025 records in this dataset, production deployments must verify that live API data feeds actually stream for a given station before enabling real-time inferences.
3. **Multi-Model Orchestration:**  
   The platform should dynamically select the predictor:
   - Deploy `RidgeRegressor` for natural river channels with smooth inertia.
   - Deploy `RandomForestRegressor` for flashy gorge channels subject to sudden pulse waves.
4. **Preservation of Production Contracts:**  
   The production inference module (`WaterLevelForecaster`) continues to serve `RAMAMANGALAM BRIDGE` without regression. Multi-station models should be exposed via explicit station-calibrated model weights once confirmed by domain hydrologists.
