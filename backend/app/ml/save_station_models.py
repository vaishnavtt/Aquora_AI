"""
AQUORA AI - Save Station-Specific Water-Level Forecaster Models
Saves verified model artifacts for PALA and TRINAYAKUDAM.
"""

import os
import sys

# Ensure backend root is in python path
BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from datetime import datetime, timezone
import joblib
from sklearn.linear_model import Ridge

from app.ml.evaluate_multi_station import (
    load_station_raw,
    create_continuous_hourly_segments,
    FEATURE_COLUMNS,
    RAW_DATA_PATH,
    RANDOM_SEED
)

MODELS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "models")
PROCESSED_DIR = os.path.abspath(os.path.join(BACKEND_DIR, "..", "data", "processed"))

def save_pala_model():
    pala_df, _ = load_station_raw(RAW_DATA_PATH, "PALA")
    p_dataset, _, _ = create_continuous_hourly_segments(pala_df, max_gap_hours=3.0)
    p_train = p_dataset[p_dataset['datetime'] < '2022-06-01'].reset_index(drop=True)
    p_val = p_dataset[(p_dataset['datetime'] >= '2022-06-01') & (p_dataset['datetime'] < '2022-09-01')].reset_index(drop=True)
    p_test = p_dataset[p_dataset['datetime'] >= '2022-09-01'].reset_index(drop=True)

    p_ridge = Ridge(alpha=1.0, random_state=RANDOM_SEED)
    p_ridge.fit(p_train[FEATURE_COLUMNS], p_train['target_delta_1h'])

    pala_artifact = {
        "model": p_ridge,
        "model_name": "RidgeRegressor (Kinematic Delta Approach)",
        "approach": "residual_delta",
        "station_name": "PALA",
        "district": "KOTTAYAM",
        "forecast_horizon": "1 hour ahead (t+1)",
        "features": FEATURE_COLUMNS,
        "split_periods": {
            "train": f"{p_train['datetime'].min()} to {p_train['datetime'].max()}",
            "validation": f"{p_val['datetime'].min()} to {p_val['datetime'].max()}",
            "test": f"{p_test['datetime'].min()} to {p_test['datetime'].max()}"
        },
        "split_counts": {
            "train": len(p_train),
            "validation": len(p_val),
            "test": len(p_test),
            "total_usable": len(p_dataset)
        },
        "trained_at": datetime.now(timezone.utc).isoformat()
    }
    target = os.path.join(MODELS_DIR, "pala_water_level_model.joblib")
    joblib.dump(pala_artifact, target)
    print(f"Saved: {target}")

    csv_target = os.path.join(PROCESSED_DIR, "pala_hourly_features.csv")
    p_dataset.to_csv(csv_target, index=False)
    print(f"Saved: {csv_target}")

def save_trinayakudam_model():
    t_df, _ = load_station_raw(RAW_DATA_PATH, "TRINAYAKUDAM")
    t_dataset, _, _ = create_continuous_hourly_segments(t_df, max_gap_hours=3.0)
    t_train = t_dataset[t_dataset['datetime'] < '2022-08-01'].reset_index(drop=True)
    t_val = t_dataset[(t_dataset['datetime'] >= '2022-08-01') & (t_dataset['datetime'] < '2023-01-01')].reset_index(drop=True)
    t_test = t_dataset[(t_dataset['datetime'] >= '2024-01-01') & (t_dataset['datetime'] < '2025-01-01')].reset_index(drop=True)

    t_ridge = Ridge(alpha=1.0, random_state=RANDOM_SEED)
    t_ridge.fit(t_train[FEATURE_COLUMNS], t_train['target_delta_1h'])

    trinayakudam_artifact = {
        "model": t_ridge,
        "model_name": "RidgeRegressor (Kinematic Delta Approach)",
        "approach": "residual_delta",
        "station_name": "TRINAYAKUDAM",
        "district": "KOTTAYAM",
        "forecast_horizon": "1 hour ahead (t+1)",
        "features": FEATURE_COLUMNS,
        "split_periods": {
            "train": f"{t_train['datetime'].min()} to {t_train['datetime'].max()}",
            "validation": f"{t_val['datetime'].min()} to {t_val['datetime'].max()}",
            "test": f"{t_test['datetime'].min()} to {t_test['datetime'].max()}"
        },
        "split_counts": {
            "train": len(t_train),
            "validation": len(t_val),
            "test": len(t_test),
            "total_usable": len(t_dataset)
        },
        "trained_at": datetime.now(timezone.utc).isoformat()
    }
    target = os.path.join(MODELS_DIR, "trinayakudam_water_level_model.joblib")
    joblib.dump(trinayakudam_artifact, target)
    print(f"Saved: {target}")

    csv_target = os.path.join(PROCESSED_DIR, "trinayakudam_hourly_features.csv")
    t_dataset.to_csv(csv_target, index=False)
    print(f"Saved: {csv_target}")

if __name__ == "__main__":
    save_pala_model()
    save_trinayakudam_model()
