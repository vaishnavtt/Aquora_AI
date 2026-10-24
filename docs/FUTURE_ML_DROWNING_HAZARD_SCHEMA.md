# AQUORA AI — Future AI/ML Drowning-Risk Specification & Dataset Schema

> **Scientific Integrity & Ethical Statement**  
> AQUORA AI strictly does **NOT** train or deploy synthetic or unverified drowning-incident models. We do not claim to forecast individual drowning outcomes without verified empirical incident logs. This document defines the formal data engineering schema, collection methodology, validation benchmarks, and ethical guidelines required before any machine-learning model may be trained or deployed for waterbody hazard prediction.

---

## 1. Ethical, Statistical & Sampling Foundations

### 1.1 The Imperative for Reliable Negative Examples (Non-Incidents)
A fundamental flaw in naive drowning prediction models is **selection bias** (learning solely from reported accidental deaths). To learn a statistically valid decision boundary, the training dataset MUST capture:
1. **Exposure / Denominator Data**: The volume of individuals present at a waterbody who engaged in aquatic activity safely without experiencing distress or drowning.
2. **Negative Sampling Regimes**: Controlled surveillance observation windows across time-of-day, seasons, and varying flow conditions where zero incidents occurred despite public presence.
3. **Severe Class Imbalance**: Drowning events are statistically rare relative to total visitor hours. Synthetic oversampling (e.g. naive SMOTE) on unrepresentative incident labels produces dangerous hallucinations. Cost-sensitive losses or extreme-value theory (EVT) modeling must be employed instead.

### 1.2 Evaluation of False Negatives vs. False Positives
In public life-safety intelligence:
- **False Negative (Worst Case)**: The system predicts "Low Risk", but rapid unseen hydrodynamic currents or cold immersion shock result in a fatal drowning. The statistical penalty for false negatives must be weighted significantly higher ($\beta \ge 4$ in $F_\beta$ evaluation).
- **False Positive**: The system issues a cautious hazard advisory when conditions are nominally passable, encouraging heightened personal vigilance or life-jacket usage.

### 1.3 Privacy Protection & De-Identification
All future human incident records must be strictly stripped of Personally Identifiable Information (PII) under the Digital Personal Data Protection Act (DPDPA) and ethical institutional review boards:
- No victim names, phone numbers, addresses, or exact residential origins.
- Age, gender, and group size may only be stored in aggregate demographic bands.
- Geographic coordinates should represent the waterbody access reach or bathymetric hazard point, not personal private properties.

### 1.4 Temporal & Geographic Out-of-Distribution Validation
To prevent overfitting to a single river basin or monsoon season:
- **Spatial Holdout**: Models must be evaluated on unseen river basins (e.g., train on Periyar and Bharathapuzha; test on Kabini and Valapattanam).
- **Temporal Holdout**: Models must be tested on distinct monsoon cycles (e.g., train on 2021–2023; test on 2024–2025).
- **No Deceptive Metrics**: Do not report high ROC-AUC or Accuracy achieved on synthetic, heavily leaked, or trivial label splits.

---

## 2. Standardized Future Dataset Schema (Tabular / Parquet)

The future observational table is structured in five integrated feature groups:

### Group A: Georeferenced Event Identification & Site Registry
| Field Name | Type | Description | Example |
|---|---|---|---|
| `observation_id` | UUID | Unique immutable record identifier | `9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d` |
| `waterbody_id` | Integer / String | Reference to `mapped_waterbodies.id` | `osm-river-periyar-malayattoor` |
| `waterbody_name` | String | Standardized geographic name | `Periyar River (Malayattoor Reach)` |
| `reach_segment_id` | String | Sub-reach or bathymetric section identifier | `KL-PER-014-GORGE` |
| `latitude` | Float (WGS84) | Precision georeferenced coordinate (6 decimals) | `10.188210` |
| `longitude` | Float (WGS84) | Precision georeferenced coordinate (6 decimals) | `76.497520` |
| `district` | String | Administrative district in Kerala | `Ernakulam` |
| `basin_region` | String | Hydrological basin / sub-catchment | `Periyar River Basin` |

### Group B: Temporal & Seasonal Context
| Field Name | Type | Description | Example |
|---|---|---|---|
| `observation_timestamp` | ISO 8601 UTC | Timestamp of observation or verified incident | `2025-08-14T14:30:00Z` |
| `local_time_ist` | String | Local Indian Standard Time | `2025-08-14 20:00:00` |
| `season_code` | Categorical | `SW_MONSOON`, `NE_MONSOON`, `POST_MONSOON`, `PRE_MONSOON_SUMMER` | `SW_MONSOON` |
| `is_public_holiday` | Boolean | True if high recreation / pilgrimage surge | `True` |
| `daylight_status` | Categorical | `DAWN`, `DAYLIGHT`, `DUSK`, `NIGHT` | `DAYLIGHT` |

### Group C: Hydrodynamic & Environmental Observations
| Field Name | Type | Description | Example |
|---|---|---|---|
| `water_depth_meters` | Float | Measured soundings or bathymetric depth at location | `4.25` |
| `surface_flow_velocity_mps` | Float | Measured flow velocity in meters per second | `1.85` |
| `river_discharge_cms` | Float | Upstream streamgage discharge in cubic meters/sec | `64.2` |
| `stage_height_meters` | Float | Local gauge height relative to datum | `12.14` |
| `stage_rate_of_change_m_hr` | Float | Stage trend over preceding 3 hours | `+0.45` |
| `catchment_rainfall_1h_mm` | Float | Local rain gauge accumulation past 1 hour | `28.0` |
| `catchment_rainfall_24h_mm` | Float | Local rain gauge accumulation past 24 hours | `112.5` |
| `water_temperature_c` | Float | Water temperature at surface and thermocline depth | `18.2` |
| `turbidity_ntu` | Float | Suspended sediment / underwater visibility indicator | `85.0` |

### Group D: Structural & Geomorphic Hazard Indicators
| Field Name | Type | Description | Example |
|---|---|---|---|
| `waterbody_type` | Categorical | `river`, `stream`, `lake`, `reservoir`, `quarry`, `waterfall`, `canal` | `river` |
| `channel_gradient_pct` | Float | Slope of riverbed / bathymetry gradient | `4.2` |
| `underwater_hazard_profile` | String / Array | `["submerged_boulders", "undertow_eddies", "deep_scour_hole"]` | `["rocky_rapids"]` |
| `egress_difficulty_rating` | Integer (1–5) | 1: Gentle sandy beach; 5: 90° sheer granite vertical face | `4` |
| `spillway_release_active` | Boolean | Upstream dam or barrage release within 6 hours | `True` |

### Group E: Outcome Labeling & Provenance
| Field Name | Type | Description | Example |
|---|---|---|---|
| `event_category` | Categorical | `NON_INCIDENT_SURVEILLANCE`, `NEAR_MISS_RESCUE`, `FATAL_DROWNING` | `NON_INCIDENT_SURVEILLANCE` |
| `exposure_count` | Integer | Estimated individuals engaged in aquatic activity | `25` |
| `incident_count` | Integer | Count of individuals in distress / drowned | `0` |
| `primary_contributing_factor`| Categorical | `SUDDEN_DEPTH_DROP`, `COLD_SHOCK`, `UNDERTOW_SWEEP`, `ALCOHOL_IMPAIRMENT`, `EXHAUSTION` | `N/A` |
| `source_authority` | String | Verification authority (Police FIR, Fire & Rescue, Forest Dept) | `Kerala Fire and Rescue Services` |
| `verification_level` | Categorical | `OFFICIAL_FIELD_REPORT`, `HOSPITAL_MEDICO_LEGAL`, `UNVERIFIED_NEWS` | `OFFICIAL_FIELD_REPORT` |

---

## 3. Transition Criteria from Rule-Based Hazard Assessment to Machine Learning

A machine-learning model may ONLY be deployed into the AQUORA AI production pipeline when the following six gates are fully verified:

1. **Gate 1 — Minimum Verified Dataset**: At least 5,000 multi-seasonal observations across all 14 Kerala districts, with balanced negative non-incident surveillance and certified official accident reports.
2. **Gate 2 — Out-of-Distribution Validation**: Spatially independent cross-validation across unseen watersheds with zero spatial data leakage.
3. **Gate 3 — False Negative Rate Cap**: The model must demonstrate an empirical False Negative Rate $< 2\%$ at the operating threshold on historical dangerous spates.
4. **Gate 4 — Uncertainty Quantification**: Every prediction must output conformal prediction sets or calibrated Bayesian uncertainty intervals; whenever epistemic uncertainty is high, the system must fallback to `INSUFFICIENT_DATA`.
5. **Gate 5 — Explainability & Feature Attributions**: SHAP (Shapley Additive exPlanations) or Integrated Gradients must explain why a score was assigned to the civil defense authorities.
6. **Gate 6 — Independent Peer Review**: Peer validation by hydrographic engineers, disaster management officials, and geospatial researchers.
