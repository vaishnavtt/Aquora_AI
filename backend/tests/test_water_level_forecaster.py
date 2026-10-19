"""
Unit and Integration Tests for RAMAMANGALAM BRIDGE Water Level Forecasting Module
"""

import os
import sys
import unittest
import json
import numpy as np
import pandas as pd

BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from app.ml.water_level_forecaster import (
    WaterLevelForecaster,
    FEATURE_COLUMNS,
    DEFAULT_MODEL_PATH,
    PRESERVED_RF_MODEL_PATH,
    DEFAULT_MAX_WATER_LEVEL_M,
    validate_water_levels,
    validate_timestamps,
    get_forecaster_for_station,
    CALIBRATED_STATIONS,
    EXCLUDED_STATIONS,
)
from app.ml.predictor import risk_predictor, AquaticRiskPredictor
from app.schemas.prediction import PredictRequest

REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
METRICS_PATH = os.path.join(REPO_ROOT, "data", "processed", "ramamangalam_forecasting_metrics.json")


class TestWaterLevelForecaster(unittest.TestCase):

    def test_saved_model_artifact_exists(self):
        """Verify the trained joblib model artifact exists on disk."""
        self.assertTrue(
            os.path.exists(DEFAULT_MODEL_PATH),
            f"Expected model artifact at {DEFAULT_MODEL_PATH}"
        )
        self.assertGreater(
            os.path.getsize(DEFAULT_MODEL_PATH),
            100,
            "Model file appears too small or empty."
        )

    def test_preserved_rf_model_exists(self):
        """Verify the preserved baseline RandomForest model artifact exists on disk."""
        self.assertTrue(
            os.path.exists(PRESERVED_RF_MODEL_PATH),
            f"Expected preserved RF model artifact at {PRESERVED_RF_MODEL_PATH}"
        )
        self.assertGreater(
            os.path.getsize(PRESERVED_RF_MODEL_PATH),
            1000,
            "Preserved RF model file appears too small or empty."
        )

    def test_metrics_json_exists_and_valid(self):
        """Verify the metrics JSON file was generated with required fields."""
        self.assertTrue(os.path.exists(METRICS_PATH), f"Metrics JSON missing at {METRICS_PATH}")
        with open(METRICS_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)

        self.assertEqual(data["station_name"], "RAMAMANGALAM BRIDGE")
        self.assertEqual(data["district"], "ERNAKULAM")
        self.assertEqual(data["forecast_horizon"], "1 hour ahead (t+1)")
        self.assertIn(data["feature_count"], [21, 25])
        self.assertTrue(data["ml_outperforms_baseline"], "Model must outperform persistence baseline")

        # Verify test metrics
        test_m = data["metrics"]["test"]
        self.assertLess(test_m["random_forest"]["mae_m"], test_m["persistence_baseline"]["mae_m"])
        self.assertLess(test_m["random_forest"]["rmse_m"], test_m["persistence_baseline"]["rmse_m"])
        if "ridge_regressor" in test_m:
            self.assertLess(test_m["ridge_regressor"]["mae_m"], test_m["persistence_baseline"]["mae_m"])
            self.assertLess(test_m["ridge_regressor"]["rmse_m"], test_m["persistence_baseline"]["rmse_m"])
            self.assertLess(test_m["ridge_regressor"]["mae_m"], test_m["random_forest"]["mae_m"])

    def test_forecaster_initialization_and_loading(self):
        """Verify the WaterLevelForecaster loads the trained artifact properly."""
        forecaster = WaterLevelForecaster()
        self.assertTrue(forecaster.is_loaded, "Forecaster should be loaded after initialization.")
        self.assertEqual(forecaster.station_name, "RAMAMANGALAM BRIDGE")
        self.assertEqual(forecaster.district, "ERNAKULAM")
        self.assertIn(len(forecaster.feature_names), [21, 25])
        self.assertIsNotNone(forecaster.model)

    def test_feature_extraction_insufficient_history_raises(self):
        """Verify that passing fewer than 13 hourly values raises ValueError."""
        short_history = [5.0, 5.1, 5.2, 5.3, 5.4]  # only 5 values
        with self.assertRaises(ValueError) as ctx:
            WaterLevelForecaster.extract_features_from_history(short_history)
        self.assertIn("At least 13", str(ctx.exception))

    def test_feature_extraction_logic(self):
        """Verify mathematical correctness of extracted lag and delta features."""
        # 13 synthetic consecutive hourly readings: 1.0 to 13.0
        synthetic_levels = [float(i) for i in range(1, 14)]
        # window: [1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0, 11.0, 12.0, 13.0]
        # wl_t = 13.0, lag_1h = 12.0, lag_2h = 11.0, lag_3h = 10.0, lag_6h = 7.0, lag_12h = 1.0
        feat_df = WaterLevelForecaster.extract_features_from_history(synthetic_levels)

        self.assertEqual(len(feat_df), 1)
        self.assertEqual(feat_df['wl_t'].iloc[0], 13.0)
        self.assertEqual(feat_df['lag_1h'].iloc[0], 12.0)
        self.assertEqual(feat_df['lag_2h'].iloc[0], 11.0)
        self.assertEqual(feat_df['lag_3h'].iloc[0], 10.0)
        self.assertEqual(feat_df['lag_6h'].iloc[0], 7.0)
        self.assertEqual(feat_df['lag_12h'].iloc[0], 1.0)

        # Deltas
        self.assertAlmostEqual(feat_df['delta_1h'].iloc[0], 1.0)
        self.assertAlmostEqual(feat_df['delta_2h'].iloc[0], 2.0)
        self.assertAlmostEqual(feat_df['delta_3h'].iloc[0], 3.0)
        self.assertAlmostEqual(feat_df['delta_6h'].iloc[0], 6.0)
        self.assertAlmostEqual(feat_df['delta_12h'].iloc[0], 12.0)

        # Rolling stats
        # w3 = [11.0, 12.0, 13.0] -> mean = 12.0
        self.assertAlmostEqual(feat_df['roll_mean_3h'].iloc[0], 12.0)
        # w6 = [8.0, 9.0, 10.0, 11.0, 12.0, 13.0] -> mean = 10.5, min = 8.0, max = 13.0
        self.assertAlmostEqual(feat_df['roll_mean_6h'].iloc[0], 10.5)
        self.assertAlmostEqual(feat_df['roll_min_6h'].iloc[0], 8.0)
        self.assertAlmostEqual(feat_df['roll_max_6h'].iloc[0], 13.0)

        # No nulls
        self.assertEqual(feat_df.isna().sum().sum(), 0)

    # -------------------------------------------------------------
    # Water Level Value Validation Tests
    # -------------------------------------------------------------

    def test_water_level_rejects_nan(self):
        """Verify that NaN water-level readings are rejected with clear error."""
        invalid_levels = [4.0] * 12 + [float('nan')]
        with self.assertRaises(ValueError) as ctx:
            validate_water_levels(invalid_levels)
        self.assertIn("cannot be NaN", str(ctx.exception))

    def test_water_level_rejects_infinity(self):
        """Verify that infinite water-level readings are rejected."""
        invalid_levels = [4.0] * 12 + [float('inf')]
        with self.assertRaises(ValueError) as ctx:
            validate_water_levels(invalid_levels)
        self.assertIn("cannot be infinite", str(ctx.exception))

    def test_water_level_rejects_negative(self):
        """Verify that negative water-level readings are rejected."""
        invalid_levels = [4.0] * 12 + [-0.5]
        with self.assertRaises(ValueError) as ctx:
            validate_water_levels(invalid_levels)
        self.assertIn("cannot be negative", str(ctx.exception))

    def test_water_level_rejects_above_provisional_limit(self):
        """Verify that readings exceeding the prototype upper limit (25m) are rejected."""
        invalid_levels = [4.0] * 12 + [26.5]
        with self.assertRaises(ValueError) as ctx:
            validate_water_levels(invalid_levels)
        self.assertIn("exceeds the provisional prototype upper bound", str(ctx.exception))

    def test_water_level_configurable_limit(self):
        """Verify that the upper limit is configurable."""
        levels = [4.0] * 12 + [28.0]
        # Should fail with default limit 25.0
        with self.assertRaises(ValueError):
            validate_water_levels(levels, max_level=25.0)
        # Should pass with relaxed limit 30.0
        validated = validate_water_levels(levels, max_level=30.0)
        self.assertEqual(len(validated), 13)
        self.assertEqual(validated[-1], 28.0)

    # -------------------------------------------------------------
    # Timestamp Validation Tests
    # -------------------------------------------------------------

    def test_timestamp_validation_valid_consecutive_hourly(self):
        """Verify that strictly consecutive hourly timestamps pass validation."""
        base_time = pd.Timestamp("2024-06-01 10:00:00Z")
        timestamps = [base_time + pd.Timedelta(hours=i) for i in range(13)]
        validated = validate_timestamps(timestamps)
        self.assertEqual(len(validated), 13)
        self.assertEqual(validated[0], base_time)
        self.assertEqual(validated[-1], base_time + pd.Timedelta(hours=12))

    def test_timestamp_validation_timezone_normalization(self):
        """Verify that various timezone formats are normalized to UTC consistently."""
        # Mix of UTC string, ISO string with offset, and timezone-naive
        timestamps = [
            "2024-06-01T10:00:00Z",
            "2024-06-01T11:00:00Z",
            "2024-06-01T12:00:00Z",
            "2024-06-01T13:00:00Z",
            "2024-06-01T14:00:00Z",
            "2024-06-01T15:00:00Z",
            "2024-06-01T16:00:00Z",
            "2024-06-01T17:00:00Z",
            "2024-06-01T18:00:00Z",
            "2024-06-01T19:00:00Z",
            "2024-06-01T20:00:00Z",
            "2024-06-01T21:00:00Z",
            "2024-06-02T03:30:00+05:30",  # Matches 22:00 UTC
        ]
        validated = validate_timestamps(timestamps)
        self.assertEqual(len(validated), 13)
        self.assertEqual(validated[-1].hour, 22)

    def test_timestamp_validation_rejects_irregular_short_intervals(self):
        """Verify rejection when interval is too short (<45 minutes)."""
        base_time = pd.Timestamp("2024-06-01 10:00:00Z")
        timestamps = [base_time + pd.Timedelta(hours=i) for i in range(13)]
        # Make reading at index 5 only 20 minutes after reading at index 4
        timestamps[5] = timestamps[4] + pd.Timedelta(minutes=20)
        with self.assertRaises(ValueError) as ctx:
            validate_timestamps(timestamps)
        self.assertIn("violates the hourly interval constraint", str(ctx.exception))

    def test_timestamp_validation_rejects_missing_gapped_intervals(self):
        """Verify rejection when an hourly observation is missing (>75 minutes gap)."""
        base_time = pd.Timestamp("2024-06-01 10:00:00Z")
        timestamps = [base_time + pd.Timedelta(hours=i) for i in range(13)]
        # Create a 2-hour gap between index 4 and index 5
        timestamps[5] = timestamps[4] + pd.Timedelta(hours=2)
        with self.assertRaises(ValueError) as ctx:
            validate_timestamps(timestamps)
        self.assertIn("violates the hourly interval constraint", str(ctx.exception))

    def test_timestamp_validation_rejects_non_chronological(self):
        """Verify rejection when timestamps are not strictly ascending."""
        base_time = pd.Timestamp("2024-06-01 10:00:00Z")
        timestamps = [base_time + pd.Timedelta(hours=i) for i in range(13)]
        # Invert timestamps at index 7 and 8
        timestamps[8] = timestamps[6]  # Duplicate / non-ascending
        with self.assertRaises(ValueError) as ctx:
            validate_timestamps(timestamps)
        self.assertIn("strictly ascending in chronological order", str(ctx.exception))

    def test_timestamp_validation_rejects_insufficient_timestamps(self):
        """Verify rejection when fewer than 13 timestamps are provided."""
        base_time = pd.Timestamp("2024-06-01 10:00:00Z")
        timestamps = [base_time + pd.Timedelta(hours=i) for i in range(8)]
        with self.assertRaises(ValueError) as ctx:
            validate_timestamps(timestamps)
        self.assertIn("At least 13", str(ctx.exception))

    # -------------------------------------------------------------
    # Prediction Integration & Format Tests
    # -------------------------------------------------------------

    def test_prediction_output_format(self):
        """Verify inference output dictionary structure and reasonable range for raw list."""
        forecaster = WaterLevelForecaster()
        recent_levels = [
            3.80, 3.82, 3.85, 3.88, 3.90, 3.92,
            3.95, 3.98, 4.00, 4.03, 4.05, 4.08, 4.10
        ]
        result = forecaster.predict_next_hour(recent_levels)

        self.assertIn("station", result)
        self.assertIn("current_water_level_m", result)
        self.assertIn("persistence_baseline_m", result)
        self.assertIn("predicted_delta_m", result)
        self.assertIn("forecasted_water_level_m", result)
        self.assertIn("rate_of_change_trend", result)
        self.assertTrue(result["is_experimental"])

        self.assertEqual(result["current_water_level_m"], 4.10)
        self.assertEqual(result["persistence_baseline_m"], 4.10)
        self.assertTrue(3.5 < result["forecasted_water_level_m"] < 5.0)
        self.assertTrue(abs(result["predicted_delta_m"]) < 0.20)
        self.assertTrue(np.isfinite(result["forecasted_water_level_m"]))

    def test_prediction_from_timestamped_readings(self):
        """Verify inference with full timestamped observation objects."""
        forecaster = WaterLevelForecaster()
        base_time = pd.Timestamp("2024-06-01 10:00:00Z")
        readings = [
            {
                "timestamp": (base_time + pd.Timedelta(hours=i)).isoformat(),
                "water_level_m": 4.0 + 0.02 * i
            }
            for i in range(13)
        ]
        result = forecaster.predict_from_timestamped_readings(readings)

        self.assertEqual(result["station"], "RAMAMANGALAM BRIDGE")
        self.assertEqual(result["current_water_level_m"], 4.24)
        self.assertIn("latest_observation_timestamp", result)
        self.assertIn("forecast_target_timestamp", result)
        self.assertEqual(result["latest_observation_timestamp"], readings[-1]["timestamp"])
        self.assertEqual(
            result["forecast_target_timestamp"],
            (base_time + pd.Timedelta(hours=13)).isoformat()
        )
        self.assertTrue(np.isfinite(result["forecasted_water_level_m"]))

    def test_existing_aquatic_risk_predictor_untouched(self):
        """Verify that the existing heuristic predictor and schemas are completely unaffected."""
        req = PredictRequest(
            water_temp_c=12.0,
            flow_rate_cms=8.5,
            depth_meters=3.5,
            rainfall_last_24h_mm=30.0,
            wind_speed_kmh=20.0,
            visibility_meters=2000.0
        )
        res = risk_predictor.predict(req)
        self.assertTrue(res.is_baseline_model)
        self.assertEqual(res.model_version, "baseline-heuristic-v0.1")
        self.assertGreater(res.risk_score, 0.0)
        self.assertIn(res.risk_level, ["low", "moderate", "high", "extreme"])

    # -------------------------------------------------------------
    # Multi-Station Model Loading & Validation Tests
    # -------------------------------------------------------------

    def test_get_forecaster_for_calibrated_stations(self):
        """Verify forecasters load successfully for all calibrated monitoring stations."""
        for station_key in ["RAMAMANGALAM BRIDGE", "PALA", "TRINAYAKUDAM"]:
            forecaster = get_forecaster_for_station(station_key)
            self.assertTrue(forecaster.is_loaded, f"Forecaster for {station_key} must be loaded")
            self.assertEqual(forecaster.station_name, CALIBRATED_STATIONS[station_key]["model_path"] and station_key)
            self.assertIsNotNone(forecaster.model)

    def test_dam_station_explicitly_rejected(self):
        """Verify dam/reservoir stations are explicitly rejected with gate telemetry explanation."""
        for dam_query in ["MANIYAR DAM", "Maniyar", "Idukki Dam", "Periyar Barrage Reservoir"]:
            with self.assertRaises(ValueError) as ctx:
                get_forecaster_for_station(dam_query)
            err = str(ctx.exception)
            self.assertIn("Forecasting rejected", err)
            self.assertTrue(
                "dam/reservoir barrage" in err or "gate maneuvers" in err or "operational telemetry" in err
            )

    def test_uncalibrated_station_rejected(self):
        """Verify uncalibrated stations are rejected with calibrated station guidance."""
        with self.assertRaises(ValueError) as ctx:
            get_forecaster_for_station("KAVARATTI LAGOON")
        err = str(ctx.exception)
        self.assertIn("not calibrated for 'KAVARATTI LAGOON'", err)
        self.assertIn("RAMAMANGALAM BRIDGE", err)
        self.assertIn("PALA", err)
        self.assertIn("TRINAYAKUDAM", err)

    def test_pala_forecaster_inference(self):
        """Verify inference execution on Pala calibrated station model."""
        pala_forecaster = get_forecaster_for_station("PALA")
        recent_levels = [4.50 + 0.01 * i for i in range(13)]  # 4.50 to 4.62
        res = pala_forecaster.predict_next_hour(recent_levels)
        self.assertEqual(res["station"], "PALA")
        self.assertEqual(res["district"], "KOTTAYAM")
        self.assertEqual(res["current_water_level_m"], 4.62)
        self.assertEqual(res["persistence_baseline_m"], 4.62)
        self.assertTrue(np.isfinite(res["forecasted_water_level_m"]))
        self.assertIn("PALA", res["notice"])

    def test_trinayakudam_forecaster_inference(self):
        """Verify inference execution on Trinayakudam calibrated station model."""
        trin_forecaster = get_forecaster_for_station("TRINAYAKUDAM")
        recent_levels = [2.30 + 0.01 * i for i in range(13)]  # 2.30 to 2.42
        res = trin_forecaster.predict_next_hour(recent_levels)
        self.assertEqual(res["station"], "TRINAYAKUDAM")
        self.assertEqual(res["district"], "KOTTAYAM")
        self.assertEqual(res["current_water_level_m"], 2.42)
        self.assertEqual(res["persistence_baseline_m"], 2.42)
        self.assertTrue(np.isfinite(res["forecasted_water_level_m"]))
        self.assertIn("TRINAYAKUDAM", res["notice"])


if __name__ == "__main__":
    unittest.main()

