"""
AQUORA AI - Experimental River Water-Level Forecasting Module
Station Focus: RAMAMANGALAM BRIDGE (Ernakulam District, Kerala)

Notice & Data Ethics:
This module is strictly an experimental one-hour-ahead river water-level (stage)
forecasting component for research prototyping.
- It does NOT predict drowning incidents.
- It does NOT evaluate personal watercraft or swimmer vulnerability.
- It does NOT invent flood safety alert thresholds or provide validated public flood warnings.
- Telemetry datasets referenced during training are historical observations (2021–2025)
  from the Kerala State Water Resources Department (Kerala SW), not live real-time feeds.
- It is decoupled from the main AquaticRiskPredictor to maintain backend API stability.
"""

import os
import math
from typing import List, Dict, Any, Optional, Sequence, Union, Tuple
import numpy as np
import pandas as pd
import joblib

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

DEFAULT_MODEL_PATH = os.path.join(
    os.path.dirname(__file__), "models", "ramamangalam_water_level_model.joblib"
)
PRESERVED_RF_MODEL_PATH = os.path.join(
    os.path.dirname(__file__), "models", "ramamangalam_water_level_model_rf.joblib"
)

# Operational & Physical Constraints for RAMAMANGALAM BRIDGE
# Note: At RAMAMANGALAM BRIDGE, observed historical water levels ranged from 2.16m to 13.76m.
# The 25.0-meter limit is a provisional prototype sanity constraint to filter erroneous sensor spikes
# (e.g. -999.0 or disconnected telemetry lines), NOT a verified physical levee/spillway overtopping threshold.
MIN_WATER_LEVEL_M = 0.0
DEFAULT_MAX_WATER_LEVEL_M = 25.0
MIN_REQUIRED_OBSERVATIONS = 13

# Hourly interval tolerance: consecutive observations must be approximately 1 hour apart (45 to 75 minutes)
MIN_HOURLY_INTERVAL_MINUTES = 45.0
MAX_HOURLY_INTERVAL_MINUTES = 75.0


def validate_water_levels(
    levels: Sequence[Any],
    max_level: float = DEFAULT_MAX_WATER_LEVEL_M
) -> List[float]:
    """
    Validates a sequence of water-level readings.

    Checks:
    - Numeric convertible
    - Non-NaN and finite (no inf)
    - Non-negative (>= 0.0m)
    - Does not exceed max_level (provisional prototype constraint)
    """
    if len(levels) < MIN_REQUIRED_OBSERVATIONS:
        raise ValueError(
            f"At least {MIN_REQUIRED_OBSERVATIONS} consecutive hourly observations are required; "
            f"provided only {len(levels)}."
        )

    validated: List[float] = []
    for idx, raw_val in enumerate(levels):
        try:
            val = float(raw_val)
        except (ValueError, TypeError):
            raise ValueError(
                f"Water level reading at index {idx} must be a valid numeric float; "
                f"received {repr(raw_val)}."
            )

        if math.isnan(val) or np.isnan(val):
            raise ValueError(f"Water level reading at index {idx} cannot be NaN.")
        if math.isinf(val) or np.isinf(val):
            raise ValueError(f"Water level reading at index {idx} cannot be infinite.")
        if val < MIN_WATER_LEVEL_M:
            raise ValueError(
                f"Water level reading at index {idx} cannot be negative; got {val:.4f}m "
                f"(minimum allowed physical stage: {MIN_WATER_LEVEL_M}m)."
            )
        if val > max_level:
            raise ValueError(
                f"Water level reading at index {idx} ({val:.4f}m) exceeds the provisional "
                f"prototype upper bound of {max_level:.1f}m. (This constraint is a prototype sanity "
                f"threshold designed to catch corrupted telemetry lines, not a verified physical flood limit)."
            )
        validated.append(val)

    return validated


def validate_timestamps(timestamps: Sequence[Any]) -> List[pd.Timestamp]:
    """
    Validates a sequence of timestamps for consecutive hourly telemetry.

    Checks:
    - At least MIN_REQUIRED_OBSERVATIONS
    - Parseable to datetime
    - Consistent timezone handling (normalized to UTC)
    - Strictly chronological (ascending order)
    - Hourly spacing: interval between adjacent timestamps must be within [45, 75] minutes.
    """
    if len(timestamps) < MIN_REQUIRED_OBSERVATIONS:
        raise ValueError(
            f"At least {MIN_REQUIRED_OBSERVATIONS} consecutive hourly observations are required; "
            f"provided only {len(timestamps)}."
        )

    try:
        # Normalize all timestamps consistently to UTC
        ts_series = pd.to_datetime(timestamps, utc=True)
    except Exception as e:
        raise ValueError(f"Failed to parse timestamp sequence: {str(e)}")

    if ts_series.isna().any():
        bad_idx = int(ts_series.isna().argmax())
        raise ValueError(f"Timestamp at index {bad_idx} is null or unparseable: {timestamps[bad_idx]}")

    # Verify chronological order and hourly spacing
    diffs = ts_series.to_series().diff().iloc[1:]
    diff_minutes = diffs.dt.total_seconds() / 60.0

    for idx, (dt_min, t_prev, t_curr) in enumerate(zip(diff_minutes, ts_series[:-1], ts_series[1:]), start=1):
        if dt_min <= 0:
            raise ValueError(
                f"Timestamps must be strictly ascending in chronological order. "
                f"Timestamp at index {idx} ({t_curr.isoformat()}) does not succeed "
                f"previous timestamp at index {idx-1} ({t_prev.isoformat()})."
            )
        if dt_min < MIN_HOURLY_INTERVAL_MINUTES or dt_min > MAX_HOURLY_INTERVAL_MINUTES:
            raise ValueError(
                f"Observation timestamps must be consecutive hourly readings (~60 minutes apart). "
                f"Interval between index {idx-1} ({t_prev.isoformat()}) and index {idx} ({t_curr.isoformat()}) "
                f"is {dt_min:.1f} minutes, which violates the hourly interval constraint "
                f"[{MIN_HOURLY_INTERVAL_MINUTES:.0f}, {MAX_HOURLY_INTERVAL_MINUTES:.0f}] minutes."
            )

    return list(ts_series)


class WaterLevelForecaster:
    """
    Experimental one-hour-ahead river water level forecaster for RAMAMANGALAM BRIDGE.
    Uses a residual delta modeling approach:
        y_hat_{t+1} = wl_t + delta_hat_{t+1}
    where delta_hat_{t+1} is predicted from 21 lagged and rolling features of past observations.
    """

    def __init__(
        self,
        model_path: Optional[str] = None,
        max_water_level_m: float = DEFAULT_MAX_WATER_LEVEL_M
    ):
        self.model_path = model_path or DEFAULT_MODEL_PATH
        self.max_water_level_m = max_water_level_m
        self.station_name = "RAMAMANGALAM BRIDGE"
        self.district = "ERNAKULAM"
        self.forecast_horizon = "1 hour ahead (t+1)"
        self.is_loaded = False
        self.artifact: Optional[Dict[str, Any]] = None
        self.model = None
        self.feature_names = FEATURE_COLUMNS

        if os.path.exists(self.model_path):
            self.load()

    def load(self, model_path: Optional[str] = None) -> bool:
        """Loads the serialized model artifact from disk."""
        target_path = model_path or self.model_path
        if not os.path.exists(target_path):
            raise FileNotFoundError(f"Forecaster artifact not found at: {target_path}")

        self.artifact = joblib.load(target_path)
        self.model = self.artifact.get("model")
        self.feature_names = self.artifact.get("features", FEATURE_COLUMNS)
        self.station_name = self.artifact.get("station_name", self.station_name)
        self.district = self.artifact.get("district", self.district)
        self.forecast_horizon = self.artifact.get("forecast_horizon", self.forecast_horizon)
        self.is_loaded = True
        return True

    @staticmethod
    def extract_features_from_history(
        history_series: Union[pd.Series, Sequence[float]],
        max_level: float = DEFAULT_MAX_WATER_LEVEL_M
    ) -> pd.DataFrame:
        """
        Calculates the required 21 feature inputs from a continuous sequence of hourly water levels.
        Requires at least 13 consecutive hourly observations (t-12 to t).
        """
        if isinstance(history_series, pd.Series):
            raw_vals = history_series.values
        else:
            raw_vals = list(history_series)

        # Validate values (finite, non-NaN, non-negative, within range)
        validated_vals = validate_water_levels(raw_vals, max_level=max_level)

        # Look at the last 13 consecutive hourly observations
        window = validated_vals[-13:]
        wl_t = float(window[-1])
        lag_1h = float(window[-2])
        lag_2h = float(window[-3])
        lag_3h = float(window[-4])
        lag_6h = float(window[-7])
        lag_12h = float(window[0])

        delta_1h = wl_t - lag_1h
        delta_2h = wl_t - lag_2h
        delta_3h = wl_t - lag_3h
        delta_6h = wl_t - lag_6h
        delta_12h = wl_t - lag_12h

        w3 = window[-3:]
        w6 = window[-6:]
        w12 = window[-12:]

        row = {
            'wl_t': wl_t,
            'lag_1h': lag_1h,
            'lag_2h': lag_2h,
            'lag_3h': lag_3h,
            'lag_6h': lag_6h,
            'lag_12h': lag_12h,
            'delta_1h': delta_1h,
            'delta_2h': delta_2h,
            'delta_3h': delta_3h,
            'delta_6h': delta_6h,
            'delta_12h': delta_12h,
            'roll_mean_3h': float(np.mean(w3)),
            'roll_std_3h': float(np.std(w3, ddof=1)) if len(w3) > 1 else 0.0,
            'roll_mean_6h': float(np.mean(w6)),
            'roll_std_6h': float(np.std(w6, ddof=1)) if len(w6) > 1 else 0.0,
            'roll_min_6h': float(np.min(w6)),
            'roll_max_6h': float(np.max(w6)),
            'roll_mean_12h': float(np.mean(w12)),
            'roll_std_12h': float(np.std(w12, ddof=1)) if len(w12) > 1 else 0.0,
            'roll_min_12h': float(np.min(w12)),
            'roll_max_12h': float(np.max(w12)),
            # Kinematic acceleration and normalized envelope dynamics
            'delta_accel_1h': float(delta_1h - (lag_1h - lag_2h)),
            'delta_ratio_3h': float(delta_1h / ((float(np.std(w3, ddof=1)) if len(w3) > 1 else 0.0) + 1e-4)),
            'relative_pos_6h': float((wl_t - float(np.min(w6))) / (float(np.max(w6)) - float(np.min(w6)) + 1e-4)),
            'relative_pos_12h': float((wl_t - float(np.min(w12))) / (float(np.max(w12)) - float(np.min(w12)) + 1e-4)),
        }
        return pd.DataFrame([row])

    def predict_next_hour(
        self,
        recent_hourly_levels: Sequence[float],
        max_level: Optional[float] = None
    ) -> Dict[str, Any]:
        """
        Generates a 1-hour-ahead forecast given recent hourly water level observations.
        Args:
            recent_hourly_levels: Sequence of at least 13 consecutive hourly water level floats [t-12, ..., t].
            max_level: Optional custom upper threshold for validation.
        Returns:
            Dictionary containing forecasted water level, predicted delta, persistence baseline,
            and status metadata.
        """
        if not self.is_loaded:
            raise RuntimeError("Model is not loaded. Ensure the trained joblib artifact is present.")

        effective_max = max_level if max_level is not None else self.max_water_level_m
        feature_df = self.extract_features_from_history(recent_hourly_levels, max_level=effective_max)
        current_level = float(feature_df['wl_t'].iloc[0])

        # Model predicts the delta (hourly change)
        X = feature_df[self.feature_names]
        predicted_delta = float(self.model.predict(X)[0])
        forecasted_level = round(current_level + predicted_delta, 4)

        return {
            "station": self.station_name,
            "district": self.district,
            "forecast_horizon": self.forecast_horizon,
            "current_water_level_m": round(current_level, 4),
            "persistence_baseline_m": round(current_level, 4),
            "predicted_delta_m": round(predicted_delta, 4),
            "forecasted_water_level_m": forecasted_level,
            "rate_of_change_trend": "rising" if predicted_delta > 0.005 else ("falling" if predicted_delta < -0.005 else "steady"),
            "model_type": self.artifact.get("model_name", "RandomForestRegressor (Delta Approach)") if self.artifact else "Unknown",
            "is_experimental": True,
            "notice": "Experimental hydrological forecast for research and development prototype testing."
        }

    def predict_from_timestamped_readings(
        self,
        readings: Sequence[Union[Dict[str, Any], Tuple[Any, float]]],
        max_level: Optional[float] = None
    ) -> Dict[str, Any]:
        """
        Generates a 1-hour-ahead forecast from timestamped observations.
        Validates that timestamps are strictly consecutive hourly readings (~60 minutes apart)
        and water levels are within physical prototype bounds.

        Args:
            readings: Sequence of at least 13 dicts or tuples:
                      [{'timestamp': '2024-06-01T10:00:00Z', 'water_level_m': 4.12}, ...]
                      or [(timestamp, water_level), ...]
            max_level: Optional custom upper threshold for validation.
        Returns:
            Dictionary containing forecast, baseline comparison, and target timestamp.
        """
        if len(readings) < MIN_REQUIRED_OBSERVATIONS:
            raise ValueError(
                f"At least {MIN_REQUIRED_OBSERVATIONS} consecutive hourly readings are required; "
                f"received {len(readings)}."
            )

        timestamps: List[Any] = []
        levels: List[float] = []

        for idx, item in enumerate(readings):
            if isinstance(item, dict):
                # Flexible key lookup
                ts = item.get("timestamp") or item.get("time") or item.get("datetime")
                wl = item.get("water_level_m") if "water_level_m" in item else item.get("water_level")
                if ts is None:
                    raise ValueError(f"Reading at index {idx} is missing 'timestamp' key.")
                if wl is None:
                    raise ValueError(f"Reading at index {idx} is missing 'water_level_m' key.")
                timestamps.append(ts)
                levels.append(wl)
            elif isinstance(item, (tuple, list)) and len(item) == 2:
                timestamps.append(item[0])
                levels.append(item[1])
            else:
                raise ValueError(
                    f"Reading at index {idx} must be a dictionary with 'timestamp' and 'water_level_m' "
                    f"or a (timestamp, water_level) tuple; received {type(item).__name__}."
                )

        # 1. Validate timestamps (strictly chronological, hourly intervals, timezone normalized)
        valid_timestamps = validate_timestamps(timestamps)

        # 2. Run prediction using validated levels
        result = self.predict_next_hour(levels, max_level=max_level)

        # 3. Add timestamp context to output
        latest_ts = valid_timestamps[-1]
        target_ts = latest_ts + pd.Timedelta(hours=1)
        result["latest_observation_timestamp"] = latest_ts.isoformat()
        result["forecast_target_timestamp"] = target_ts.isoformat()

        return result
