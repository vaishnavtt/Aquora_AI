"""
AQUORA AI - Experimental River Water-Level Forecasting Training Pipeline
Target Station: RAMAMANGALAM BRIDGE (Ernakulam District, Kerala)

This script trains and evaluates experimental one-hour-ahead river water level
forecasting models using real telemetry data from Kerala SW.

Pipeline:
1. Loads raw telemetry observations from data/raw/rwl_tel_hr_kerala_sw_999_2021_2025.csv.
2. Filters for RAMAMANGALAM BRIDGE, sorts chronologically, and cleans data.
3. Detects telemetry gaps (> 3.0 hours) and segments into continuous observation windows.
   (Does NOT interpolate across large multi-day or 540-day telemetry suspensions).
4. Resamples each continuous segment to a uniform 1-hour grid, interpolating at most
   2 consecutive missing hourly observations within an active segment.
5. Constructs 21 lagged and rolling features using past observations only (zero future leakage).
6. Defines the target: 1-hour-ahead water level (via residual delta approach).
7. Splits data chronologically:
   - Train: 2021-06-09 to 2022-07-30 (5,612 hourly samples)
   - Validation: 2022-08-02 to 2022-11-25 (2,396 hourly samples)
   - Out-of-Time Test: 2024-05-19 to 2024-10-04 (3,103 hourly samples)
8. Evaluates Persistence Baseline, RandomForestRegressor, and HistGradientBoostingRegressor.
9. Persists the selected trained model to backend/app/ml/models/ramamangalam_water_level_model.joblib.
10. Saves evaluation metrics and configuration to data/processed/ramamangalam_forecasting_metrics.json.
"""

import os
import sys
import json
from datetime import datetime, timezone
from typing import Dict, Any, List

import numpy as np
import pandas as pd
import joblib
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.ensemble import RandomForestRegressor, HistGradientBoostingRegressor, ExtraTreesRegressor
from sklearn.linear_model import Ridge

# Configure paths relative to repository root
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, "..", "..", ".."))

RAW_DATA_PATH = os.path.join(REPO_ROOT, "data", "raw", "rwl_tel_hr_kerala_sw_999_2021_2025.csv")
MODELS_DIR = os.path.join(SCRIPT_DIR, "models")
MODEL_OUTPUT_PATH = os.path.join(MODELS_DIR, "ramamangalam_water_level_model.joblib")
PRESERVED_RF_MODEL_PATH = os.path.join(MODELS_DIR, "ramamangalam_water_level_model_rf.joblib")
PROCESSED_DIR = os.path.join(REPO_ROOT, "data", "processed")
METRICS_OUTPUT_PATH = os.path.join(PROCESSED_DIR, "ramamangalam_forecasting_metrics.json")
FEATURES_CSV_PATH = os.path.join(PROCESSED_DIR, "ramamangalam_hourly_features.csv")

BASE_FEATURE_COLUMNS = [
    'wl_t', 'lag_1h', 'lag_2h', 'lag_3h', 'lag_6h', 'lag_12h',
    'delta_1h', 'delta_2h', 'delta_3h', 'delta_6h', 'delta_12h',
    'roll_mean_3h', 'roll_std_3h',
    'roll_mean_6h', 'roll_std_6h', 'roll_min_6h', 'roll_max_6h',
    'roll_mean_12h', 'roll_std_12h', 'roll_min_12h', 'roll_max_12h'
]

KINEMATIC_FEATURE_COLUMNS = [
    'delta_accel_1h',
    'delta_ratio_3h',
    'relative_pos_6h',
    'relative_pos_12h'
]

FEATURE_COLUMNS = BASE_FEATURE_COLUMNS + KINEMATIC_FEATURE_COLUMNS

STATION_NAME = "RAMAMANGALAM BRIDGE"
GAP_THRESHOLD_HOURS = 3.0
RANDOM_SEED = 42

def load_and_preprocess_station_data(csv_path: str, station_name: str) -> pd.DataFrame:
    """Loads CSV, filters for station, parses timestamps, and validates records."""
    print(f"[1/6] Loading raw telemetry from: {csv_path}")
    if not os.path.exists(csv_path):
        raise FileNotFoundError(f"Source dataset not found at {csv_path}")

    df = pd.read_csv(csv_path, low_memory=False)
    station_df = df[df['Station'] == station_name].copy()
    print(f"      Total raw rows for {station_name}: {len(station_df)}")

    # Parse timestamps
    station_df['datetime'] = pd.to_datetime(
        station_df['Data Acquisition Time'], format='%d-%m-%Y %H:%M', errors='coerce'
    )
    if station_df['datetime'].isna().sum() > 0:
        raise ValueError("Detected unparseable datetime strings in station telemetry.")

    # Sort chronologically
    station_df = station_df.sort_values('datetime').reset_index(drop=True)

    # Parse water level
    wl_col = 'River Water Level Telemetry Hourly (meter)'
    station_df['water_level'] = pd.to_numeric(station_df[wl_col], errors='coerce')
    if station_df['water_level'].isna().sum() > 0:
        raise ValueError("Detected unparseable water level values.")

    # Check for duplicate timestamps
    dup_count = station_df['datetime'].duplicated().sum()
    if dup_count > 0:
        print(f"      Removing {dup_count} duplicate timestamp records...")
        station_df = station_df.drop_duplicates(subset=['datetime'], keep='first').reset_index(drop=True)

    return station_df

def create_continuous_hourly_segments(df: pd.DataFrame, max_gap_hours: float) -> pd.DataFrame:
    """
    Identifies continuous segments based on telemetry gaps and resamples to 1h grid.
    Does NOT interpolate across large gaps (> max_gap_hours).
    """
    print(f"[2/6] Segmenting observations with gap threshold = {max_gap_hours} hours...")
    df = df.copy()
    df['gap_hours'] = df['datetime'].diff().dt.total_seconds() / 3600.0
    df['segment_id'] = (df['gap_hours'] > max_gap_hours).cumsum()

    segment_dfs = []
    skipped_short_segments = 0

    for seg_id, seg_data in df.groupby('segment_id'):
        s_start = seg_data['datetime'].min().floor('h')
        s_end = seg_data['datetime'].max().ceil('h')
        duration_hr = (s_end - s_start).total_seconds() / 3600.0

        # Require at least 16 hours to form valid 12-hour lags and targets
        if duration_hr < 16:
            skipped_short_segments += 1
            continue

        # Resample to hourly mean
        hourly = seg_data.set_index('datetime')['water_level'].resample('1h').mean()
        # Linearly interpolate gaps of at most 2 missing hours within active segment
        hourly = hourly.interpolate(method='linear', limit=2)

        seg_df = pd.DataFrame({'wl': hourly})
        seg_df['datetime'] = seg_df.index
        seg_df['segment_id'] = seg_id

        # Target: 1 hour ahead
        seg_df['target_wl_1h'] = seg_df['wl'].shift(-1)
        seg_df['target_delta_1h'] = seg_df['target_wl_1h'] - seg_df['wl']

        # Past features strictly from past observations:
        seg_df['wl_t'] = seg_df['wl']
        seg_df['lag_1h'] = seg_df['wl'].shift(1)
        seg_df['lag_2h'] = seg_df['wl'].shift(2)
        seg_df['lag_3h'] = seg_df['wl'].shift(3)
        seg_df['lag_6h'] = seg_df['wl'].shift(6)
        seg_df['lag_12h'] = seg_df['wl'].shift(12)

        seg_df['delta_1h'] = seg_df['wl_t'] - seg_df['lag_1h']
        seg_df['delta_2h'] = seg_df['wl_t'] - seg_df['lag_2h']
        seg_df['delta_3h'] = seg_df['wl_t'] - seg_df['lag_3h']
        seg_df['delta_6h'] = seg_df['wl_t'] - seg_df['lag_6h']
        seg_df['delta_12h'] = seg_df['wl_t'] - seg_df['lag_12h']

        seg_df['roll_mean_3h'] = seg_df['wl'].rolling(3).mean()
        seg_df['roll_std_3h'] = seg_df['wl'].rolling(3).std().fillna(0.0)

        seg_df['roll_mean_6h'] = seg_df['wl'].rolling(6).mean()
        seg_df['roll_std_6h'] = seg_df['wl'].rolling(6).std().fillna(0.0)
        seg_df['roll_min_6h'] = seg_df['wl'].rolling(6).min()
        seg_df['roll_max_6h'] = seg_df['wl'].rolling(6).max()

        seg_df['roll_mean_12h'] = seg_df['wl'].rolling(12).mean()
        seg_df['roll_std_12h'] = seg_df['wl'].rolling(12).std().fillna(0.0)
        seg_df['roll_min_12h'] = seg_df['wl'].rolling(12).min()
        seg_df['roll_max_12h'] = seg_df['wl'].rolling(12).max()

        # Hydrodynamic kinematic curvature and envelope features
        seg_df['delta_accel_1h'] = seg_df['delta_1h'] - (seg_df['lag_1h'] - seg_df['lag_2h'])
        seg_df['delta_ratio_3h'] = seg_df['delta_1h'] / (seg_df['roll_std_3h'] + 1e-4)
        seg_df['relative_pos_6h'] = (seg_df['wl_t'] - seg_df['roll_min_6h']) / (seg_df['roll_max_6h'] - seg_df['roll_min_6h'] + 1e-4)
        seg_df['relative_pos_12h'] = (seg_df['wl_t'] - seg_df['roll_min_12h']) / (seg_df['roll_max_12h'] - seg_df['roll_min_12h'] + 1e-4)

        # Drop boundary NaNs (lags not ready at start, target not ready at end)
        clean_seg = seg_df.dropna().copy()
        if len(clean_seg) > 0:
            segment_dfs.append(clean_seg)

    print(f"      Formed {len(segment_dfs)} valid continuous segments (skipped {skipped_short_segments} short bursts <16h).")
    full_dataset = pd.concat(segment_dfs, ignore_index=True)
    print(f"      Total clean hourly feature samples: {len(full_dataset)}")
    return full_dataset

def evaluate_predictions(y_true: np.ndarray, y_pred: np.ndarray, model_name: str) -> Dict[str, float]:
    """Calculates MAE, RMSE, and R2."""
    mae = float(mean_absolute_error(y_true, y_pred))
    rmse = float(np.sqrt(mean_squared_error(y_true, y_pred)))
    r2 = float(r2_score(y_true, y_pred))
    return {
        "model": model_name,
        "mae_m": round(mae, 6),
        "rmse_m": round(rmse, 6),
        "r2": round(r2, 6)
    }

def train_and_evaluate(dataset: pd.DataFrame) -> Dict[str, Any]:
    """Splits data chronologically, trains models, evaluates metrics, and returns results."""
    print("[3/6] Partitioning data chronologically...")
    train_mask = (dataset['datetime'] < '2022-08-01')
    val_mask = (dataset['datetime'] >= '2022-08-01') & (dataset['datetime'] < '2023-01-01')
    test_mask = (dataset['datetime'] >= '2024-01-01') & (dataset['datetime'] < '2025-01-01')

    train_df = dataset[train_mask].reset_index(drop=True)
    val_df = dataset[val_mask].reset_index(drop=True)
    test_df = dataset[test_mask].reset_index(drop=True)

    print(f"      Train Set:      {len(train_df):5d} samples ({train_df['datetime'].min()} to {train_df['datetime'].max()})")
    print(f"      Validation Set: {len(val_df):5d} samples ({val_df['datetime'].min()} to {val_df['datetime'].max()})")
    print(f"      Out-of-Time Test: {len(test_df):5d} samples ({test_df['datetime'].min()} to {test_df['datetime'].max()})")

    X_train = train_df[FEATURE_COLUMNS]
    y_train_delta = train_df['target_delta_1h']
    y_train_level = train_df['target_wl_1h']

    X_val = val_df[FEATURE_COLUMNS]
    y_val_delta = val_df['target_delta_1h']
    y_val_level = val_df['target_wl_1h']

    X_test = test_df[FEATURE_COLUMNS]
    y_test_delta = test_df['target_delta_1h']
    y_test_level = test_df['target_wl_1h']

    # --- 1. Persistence Baseline ---
    # Prediction: y_hat_{t+1} = wl_t
    print("\n[4/6] Evaluating Persistence Baseline...")
    base_val_pred = val_df['wl_t'].values
    base_test_pred = test_df['wl_t'].values

    val_base = evaluate_predictions(y_val_level.values, base_val_pred, "Persistence Baseline")
    test_base = evaluate_predictions(y_test_level.values, base_test_pred, "Persistence Baseline")

    # --- 2. RandomForestRegressor (Preserved Baseline ML Model) ---
    print("[5/6] Training Machine Learning Models...")
    print("      -> Training RandomForestRegressor (predicting delta)...")
    rf_model = RandomForestRegressor(
        n_estimators=100,
        max_depth=10,
        min_samples_split=10,
        min_samples_leaf=4,
        random_state=RANDOM_SEED,
        n_jobs=-1
    )
    rf_model.fit(X_train, y_train_delta)

    rf_train_preds = train_df['wl_t'].values + rf_model.predict(X_train)
    rf_val_preds = val_df['wl_t'].values + rf_model.predict(X_val)
    rf_test_preds = test_df['wl_t'].values + rf_model.predict(X_test)

    train_rf = evaluate_predictions(y_train_level.values, rf_train_preds, "RandomForestRegressor (Delta)")
    val_rf = evaluate_predictions(y_val_level.values, rf_val_preds, "RandomForestRegressor (Delta)")
    test_rf = evaluate_predictions(y_test_level.values, rf_test_preds, "RandomForestRegressor (Delta)")

    # --- 3. HistGradientBoostingRegressor ---
    print("      -> Training HistGradientBoostingRegressor (predicting delta)...")
    hgb_model = HistGradientBoostingRegressor(
        max_iter=100,
        max_depth=6,
        min_samples_leaf=15,
        random_state=RANDOM_SEED
    )
    hgb_model.fit(X_train, y_train_delta)

    hgb_train_preds = train_df['wl_t'].values + hgb_model.predict(X_train)
    hgb_val_preds = val_df['wl_t'].values + hgb_model.predict(X_val)
    hgb_test_preds = test_df['wl_t'].values + hgb_model.predict(X_test)

    train_hgb = evaluate_predictions(y_train_level.values, hgb_train_preds, "HistGradientBoostingRegressor (Delta)")
    val_hgb = evaluate_predictions(y_val_level.values, hgb_val_preds, "HistGradientBoostingRegressor (Delta)")
    test_hgb = evaluate_predictions(y_test_level.values, hgb_test_preds, "HistGradientBoostingRegressor (Delta)")

    # --- 4. ExtraTreesRegressor ---
    print("      -> Training ExtraTreesRegressor (predicting delta)...")
    et_model = ExtraTreesRegressor(
        n_estimators=100,
        max_depth=12,
        min_samples_leaf=4,
        random_state=RANDOM_SEED,
        n_jobs=-1
    )
    et_model.fit(X_train, y_train_delta)

    et_val_preds = val_df['wl_t'].values + et_model.predict(X_val)
    et_test_preds = test_df['wl_t'].values + et_model.predict(X_test)

    val_et = evaluate_predictions(y_val_level.values, et_val_preds, "ExtraTreesRegressor (Delta)")
    test_et = evaluate_predictions(y_test_level.values, et_test_preds, "ExtraTreesRegressor (Delta)")

    # --- 5. Ridge Regressor (L2 regularized linear model on kinematic delta) ---
    print("      -> Training Ridge Regressor (predicting delta with L2 regularization)...")
    ridge_model = Ridge(alpha=1.0, random_state=RANDOM_SEED)
    ridge_model.fit(X_train, y_train_delta)

    ridge_train_preds = train_df['wl_t'].values + ridge_model.predict(X_train)
    ridge_val_preds = val_df['wl_t'].values + ridge_model.predict(X_val)
    ridge_test_preds = test_df['wl_t'].values + ridge_model.predict(X_test)

    train_ridge = evaluate_predictions(y_train_level.values, ridge_train_preds, "RidgeRegressor (Kinematic Delta)")
    val_ridge = evaluate_predictions(y_val_level.values, ridge_val_preds, "RidgeRegressor (Kinematic Delta)")
    test_ridge = evaluate_predictions(y_test_level.values, ridge_test_preds, "RidgeRegressor (Kinematic Delta)")

    # Print Side-by-Side Comparison
    print("\n" + "=" * 85)
    print("HYDROLOGICAL FORECASTING BENCHMARK — CHRONOLOGICAL EVALUATION")
    print("=" * 85)

    val_table = pd.DataFrame([val_base, val_rf, val_hgb, val_et, val_ridge])
    print("\n--- VALIDATION SET (Late 2022 Monsoon — 2,396 samples) ---")
    print(val_table.to_string(index=False))

    test_table = pd.DataFrame([test_base, test_rf, test_hgb, test_et, test_ridge])
    print("\n--- OUT-OF-TIME TEST SET (2024 Monsoon Season — 3,103 samples) ---")
    print(test_table.to_string(index=False))

    # Calculate percentage improvement of Champion (Ridge) over Persistence and RF on Test
    ridge_mae_imp_base = ((test_base['mae_m'] - test_ridge['mae_m']) / test_base['mae_m']) * 100.0
    ridge_rmse_imp_base = ((test_base['rmse_m'] - test_ridge['rmse_m']) / test_base['rmse_m']) * 100.0

    rf_mae_imp_base = ((test_base['mae_m'] - test_rf['mae_m']) / test_base['mae_m']) * 100.0
    rf_rmse_imp_base = ((test_base['rmse_m'] - test_rf['rmse_m']) / test_base['rmse_m']) * 100.0

    ridge_vs_rf_mae = ((test_rf['mae_m'] - test_ridge['mae_m']) / test_rf['mae_m']) * 100.0
    ridge_vs_rf_rmse = ((test_rf['rmse_m'] - test_ridge['rmse_m']) / test_rf['rmse_m']) * 100.0

    print(f"\nModel Performance Analysis (Held-Out 2024 Test Set):")
    print(f"  Persistence Baseline : MAE = {test_base['mae_m']:.6f}m, RMSE = {test_base['rmse_m']:.6f}m")
    print(f"  Preserved RF Model   : MAE = {test_rf['mae_m']:.6f}m, RMSE = {test_rf['rmse_m']:.6f}m ({rf_mae_imp_base:+.2f}% MAE vs base)")
    print(f"  Champion Ridge Model : MAE = {test_ridge['mae_m']:.6f}m, RMSE = {test_ridge['rmse_m']:.6f}m ({ridge_mae_imp_base:+.2f}% MAE vs base)")
    print(f"  Ridge gain over RF   : +{ridge_vs_rf_mae:.2f}% MAE improvement, +{ridge_vs_rf_rmse:.2f}% RMSE improvement")
    print("=" * 85)

    outperforms_baseline = (test_ridge['mae_m'] < test_base['mae_m']) and (test_ridge['rmse_m'] < test_base['rmse_m'])

    results = {
        "station_name": STATION_NAME,
        "district": "ERNAKULAM",
        "state": "Kerala",
        "agency": "Kerala SW",
        "forecast_horizon": "1 hour ahead (t+1)",
        "approach": "residual_delta",
        "gap_threshold_hours": GAP_THRESHOLD_HOURS,
        "random_seed": RANDOM_SEED,
        "features": FEATURE_COLUMNS,
        "feature_count": len(FEATURE_COLUMNS),
        "split_counts": {
            "train": len(train_df),
            "validation": len(val_df),
            "test": len(test_df),
            "total_usable": len(dataset)
        },
        "split_periods": {
            "train": f"{train_df['datetime'].min()} to {train_df['datetime'].max()}",
            "validation": f"{val_df['datetime'].min()} to {val_df['datetime'].max()}",
            "test": f"{test_df['datetime'].min()} to {test_df['datetime'].max()}"
        },
        "metrics": {
            "validation": {
                "persistence_baseline": val_base,
                "random_forest": val_rf,
                "hist_gradient_boosting": val_hgb,
                "extra_trees": val_et,
                "ridge_regressor": val_ridge
            },
            "test": {
                "persistence_baseline": test_base,
                "random_forest": test_rf,
                "hist_gradient_boosting": test_hgb,
                "extra_trees": test_et,
                "ridge_regressor": test_ridge
            }
        },
        "rf_improvement_over_baseline_pct": {
            "mae": round(rf_mae_imp_base, 2),
            "rmse": round(rf_rmse_imp_base, 2)
        },
        "ridge_improvement_over_baseline_pct": {
            "mae": round(ridge_mae_imp_base, 2),
            "rmse": round(ridge_rmse_imp_base, 2)
        },
        "ridge_improvement_over_rf_pct": {
            "mae": round(ridge_vs_rf_mae, 2),
            "rmse": round(ridge_vs_rf_rmse, 2)
        },
        "ml_outperforms_baseline": outperforms_baseline,
        "selected_model": "RidgeRegressor (Kinematic Delta Approach)",
        "preserved_model": "RandomForestRegressor (Delta Approach)",
        "trained_at": datetime.now(timezone.utc).isoformat()
    }

    return results, ridge_model, rf_model, dataset

def save_artifacts(results: Dict[str, Any], champion_model: Any, preserved_rf_model: Any, dataset: pd.DataFrame):
    """Saves model joblib, preserved RF model, metrics JSON, and processed feature CSV."""
    print("[6/6] Saving model artifacts and evaluation metrics...")
    os.makedirs(MODELS_DIR, exist_ok=True)
    os.makedirs(PROCESSED_DIR, exist_ok=True)

    # 1. Save Preserved RF Model
    rf_artifact = {
        "model": preserved_rf_model,
        "model_name": results["preserved_model"],
        "approach": results["approach"],
        "station_name": results["station_name"],
        "district": results["district"],
        "forecast_horizon": results["forecast_horizon"],
        "features": results["features"],
        "metrics": results["metrics"],
        "split_periods": results["split_periods"],
        "split_counts": results["split_counts"],
        "trained_at": results["trained_at"]
    }
    joblib.dump(rf_artifact, PRESERVED_RF_MODEL_PATH)
    print(f"      Saved preserved RF model to:     {PRESERVED_RF_MODEL_PATH}")

    # 2. Save Champion Ridge Model
    champion_artifact = {
        "model": champion_model,
        "model_name": results["selected_model"],
        "approach": results["approach"],
        "station_name": results["station_name"],
        "district": results["district"],
        "forecast_horizon": results["forecast_horizon"],
        "features": results["features"],
        "metrics": results["metrics"],
        "split_periods": results["split_periods"],
        "split_counts": results["split_counts"],
        "trained_at": results["trained_at"]
    }
    joblib.dump(champion_artifact, MODEL_OUTPUT_PATH)
    print(f"      Saved champion Ridge model to:   {MODEL_OUTPUT_PATH}")

    # 3. Save Metrics JSON
    with open(METRICS_OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2)
    print(f"      Saved metrics JSON to:           {METRICS_OUTPUT_PATH}")

    # 4. Save hourly feature dataset
    dataset.to_csv(FEATURES_CSV_PATH, index=False)
    print(f"      Saved processed dataset:         {FEATURES_CSV_PATH}")

def main():
    station_df = load_and_preprocess_station_data(RAW_DATA_PATH, STATION_NAME)
    continuous_df = create_continuous_hourly_segments(station_df, GAP_THRESHOLD_HOURS)
    results, champion_model, rf_model, clean_dataset = train_and_evaluate(continuous_df)
    save_artifacts(results, champion_model, rf_model, clean_dataset)
    print("\nTraining and evaluation pipeline completed successfully!")

if __name__ == "__main__":
    main()
