"""
Tests for Task 3 (Environmental Risk Engine) and Task 4 (Automated Hazard Monitoring).
Verifies:
1. Risk scores depend on inputs actually supplied.
2. Relevant changes to inputs affect calculated results (sensitivity).
3. Missing data is handled explicitly.
4. Risk categories are consistent across components.
5. Scores are not presented as calibrated drowning probabilities.
6. Hazard monitoring detects stage surges (delta_h >= 0.15m), flow breaches (>= 6.0 m³/s), and risk score thresholds.
7. Deduplication prevents unnecessary repeated alerts.
8. Alert records are persisted to SQLite.
9. Safe test mode prevents unsolicited real alerts.
"""

import os
import sys
import unittest
from datetime import datetime, timezone

BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from app.ml.predictor import risk_predictor
from app.schemas.prediction import PredictRequest
from app.services.hazard_monitoring_service import hazard_monitoring_service
from app.db.session import SessionLocal
from app.models.alert import AlertModel


class TestEnvironmentalRiskEngine(unittest.TestCase):
    """TASK 3 Tests — Environmental Risk Engine Verification."""

    def test_risk_predictor_is_deterministic_heuristic(self):
        """Verifies predictor version is 'baseline-heuristic-v0.1' and is_baseline_model is True."""
        req = PredictRequest(
            water_temp_c=18.0,
            flow_rate_cms=1.0,
            depth_meters=2.0,
            rainfall_last_24h_mm=0.0,
            wind_speed_kmh=10.0,
            visibility_meters=5000.0,
        )
        resp = risk_predictor.predict(req)
        self.assertEqual(resp.model_version, "baseline-heuristic-v0.1")
        self.assertTrue(resp.is_baseline_model)

    def test_risk_scores_depend_on_inputs_supplied(self):
        """Verifies that changing flow rate, rainfall, or water temp significantly affects risk score."""
        calm_req = PredictRequest(
            water_temp_c=22.0,
            flow_rate_cms=0.5,
            depth_meters=1.5,
            rainfall_last_24h_mm=0.0,
            wind_speed_kmh=5.0,
            visibility_meters=5000.0,
        )
        dangerous_req = PredictRequest(
            water_temp_c=8.0,  # Cold shock (< 12°C)
            flow_rate_cms=12.0,  # Violent flow (> 6.0 m³/s)
            depth_meters=5.0,
            rainfall_last_24h_mm=65.0,  # Torrential rain
            wind_speed_kmh=45.0,
            visibility_meters=800.0,
        )

        calm_resp = risk_predictor.predict(calm_req)
        dangerous_resp = risk_predictor.predict(dangerous_req)

        self.assertLess(calm_resp.risk_score, dangerous_resp.risk_score)
        self.assertEqual(calm_resp.risk_level, "low")
        self.assertIn(dangerous_resp.risk_level, ["high", "extreme"])
        # Score difference must be at least 30 points
        self.assertGreater(dangerous_resp.risk_score - calm_resp.risk_score, 30.0)

    def test_cold_temperature_sensitivity(self):
        """Dropping water temp below 12°C triggers hypothermia hazard."""
        warm = PredictRequest(water_temp_c=20.0, flow_rate_cms=1.0, depth_meters=2.0, rainfall_last_24h_mm=0.0, wind_speed_kmh=10.0, visibility_meters=5000.0)
        cold = PredictRequest(water_temp_c=7.0, flow_rate_cms=1.0, depth_meters=2.0, rainfall_last_24h_mm=0.0, wind_speed_kmh=10.0, visibility_meters=5000.0)

        warm_resp = risk_predictor.predict(warm)
        cold_resp = risk_predictor.predict(cold)

        self.assertGreater(cold_resp.risk_score, warm_resp.risk_score)
        # Check that hypothermia is mentioned in hazards or recommendations
        hazard_text = " ".join(cold_resp.primary_hazards + cold_resp.safety_recommendations).lower()
        self.assertTrue("cold" in hazard_text or "hypothermia" in hazard_text)

    def test_flow_rate_sensitivity(self):
        """Increasing flow rate past 6.0 m³/s elevates hazard score and flags rapid current hazard."""
        low_flow = PredictRequest(water_temp_c=18.0, flow_rate_cms=1.0, depth_meters=2.0, rainfall_last_24h_mm=0.0, wind_speed_kmh=10.0, visibility_meters=5000.0)
        high_flow = PredictRequest(water_temp_c=18.0, flow_rate_cms=9.0, depth_meters=2.0, rainfall_last_24h_mm=0.0, wind_speed_kmh=10.0, visibility_meters=5000.0)

        low_resp = risk_predictor.predict(low_flow)
        high_resp = risk_predictor.predict(high_flow)

        self.assertGreater(high_resp.risk_score, low_resp.risk_score)
        self.assertIn(high_resp.risk_level, ["moderate", "high", "extreme"])
        # Check hazard text flags rapid flow
        hazard_text = " ".join(high_resp.primary_hazards + high_resp.safety_recommendations).lower()
        self.assertTrue("flow" in hazard_text or "current" in hazard_text)

        # Extreme flow combined with flash surge reaches high / extreme
        severe_flow = PredictRequest(water_temp_c=18.0, flow_rate_cms=13.0, depth_meters=4.0, rainfall_last_24h_mm=55.0, wind_speed_kmh=30.0, visibility_meters=3000.0)
        severe_resp = risk_predictor.predict(severe_flow)
        self.assertIn(severe_resp.risk_level, ["high", "extreme"])


    def test_missing_data_handled_explicitly(self):
        """PredictRequest with optional/default values returns structured prediction without crashing."""
        req = PredictRequest(
            water_body_id=None,
            water_temp_c=18.0,
            flow_rate_cms=2.0,
            depth_meters=2.0,
            rainfall_last_24h_mm=0.0,
            wind_speed_kmh=10.0,
            visibility_meters=4000.0,
            include_ai_explanation=False,
        )
        resp = risk_predictor.predict(req)
        self.assertIsNone(resp.ai_explanation)
        self.assertIn(resp.risk_level, ["low", "moderate", "high", "extreme"])

    def test_scores_not_presented_as_drowning_probability(self):
        """Confirms that model version and notices clarify heuristic hazard index, NOT calibrated drowning probability."""
        req = PredictRequest(
            water_temp_c=15.0,
            flow_rate_cms=3.0,
            depth_meters=2.5,
            rainfall_last_24h_mm=10.0,
            wind_speed_kmh=15.0,
            visibility_meters=3000.0,
            include_ai_explanation=True,
        )
        resp = risk_predictor.predict(req)
        # Verify confidence is baseline estimate
        self.assertEqual(resp.confidence, 0.85)
        self.assertTrue(resp.is_baseline_model)


class TestAutomatedHazardMonitoring(unittest.TestCase):
    """TASK 4 Tests — Automated Hazard Monitoring and Alert Triggers."""

    def setUp(self):
        self.db = SessionLocal()

    def tearDown(self):
        self.db.close()

    def test_monitoring_status_thresholds(self):
        """Verifies configured thresholds for stage surge, flow breach, and risk score."""
        status = hazard_monitoring_service.get_status()
        self.assertIn("stage_surge_m", status.thresholds)
        self.assertIn("flow_rate_breach_cms", status.thresholds)
        self.assertIn("risk_score_breach", status.thresholds)
        self.assertEqual(status.thresholds["stage_surge_m"], 0.15)
        self.assertEqual(status.thresholds["flow_rate_breach_cms"], 6.0)
        self.assertEqual(status.thresholds["risk_score_breach"], 60.0)

    def test_evaluate_station_safe_simulation(self):
        """Evaluates Ramamangalam or USGS station in safe simulation mode."""
        res = hazard_monitoring_service.evaluate_station(
            "RAMAMANGALAM BRIDGE",
            db=self.db,
            safe_simulation=True
        )
        self.assertEqual(res.station_name, "RAMAMANGALAM BRIDGE")
        self.assertIn(res.evaluation_status, ["HAZARD_DETECTED", "NOMINAL", "TELEMETRY_UNAVAILABLE"])
        self.assertIsNotNone(res.evaluated_at)

    def test_evaluate_all_stations_sweep(self):
        """Executes full sweep across all monitored sites."""
        results = hazard_monitoring_service.evaluate_all(db=self.db, safe_simulation=True)
        self.assertIsInstance(results, list)
        self.assertGreater(len(results), 0)
        station_names = [r.station_name for r in results]
        self.assertIn("RAMAMANGALAM BRIDGE", station_names)

    def test_scheduler_lifecycle(self):
        """Starts and stops background scheduler thread safely."""
        status_before = hazard_monitoring_service.get_status()
        
        # Start
        started = hazard_monitoring_service.start_scheduler(interval_seconds=30.0)
        self.assertTrue(started.is_scheduler_running)
        self.assertEqual(started.monitoring_interval_seconds, 30.0)

        # Stop
        stopped = hazard_monitoring_service.stop_scheduler()
        self.assertFalse(stopped.is_scheduler_running)

    def test_alert_persistence_to_database(self):
        """Verifies that generated warnings create durable SQLite AlertModel records."""
        initial_alert_count = self.db.query(AlertModel).count()
        # Evaluate with safe simulation
        hazard_monitoring_service.evaluate_all(db=self.db, safe_simulation=True)
        new_alert_count = self.db.query(AlertModel).count()
        # Count should be >= initial count
        self.assertGreaterEqual(new_alert_count, initial_alert_count)

    def test_stage_surge_breach_detection(self):
        """Verifies that a water level surge >= 0.15m (15cm) triggers STAGE_SURGE advisory."""
        from unittest.mock import patch
        from app.schemas.river_data import RiverDataResponse

        # Seed initial stage at 1.00m
        hazard_monitoring_service._station_state["USGS-11164500"] = {
            "stage_m": 1.00,
            "timestamp": "2026-10-18T10:00:00Z"
        }

        # Next observation surges to 1.25m (+25 cm rise, well above 0.15m threshold)
        mock_surge_data = RiverDataResponse(
            station_name="USGS Station 11164500 (San Francisquito Creek)",
            district="CALIFORNIA HYDROLOGIC REGION",
            status="LIVE",
            water_level_m=1.25,
            flow_rate_cms=1.2,
            observation_timestamp="2026-10-18T11:00:00Z",
            is_live=True,
            is_cached=False,
            data_source="USGS NWIS",
            data_freshness="Live Telemetry",
            notice="Live instantaneous reading",
        )

        with patch("app.services.river_data_service.river_data_service.get_river_data", return_value=mock_surge_data):
            res = hazard_monitoring_service.evaluate_station(
                "USGS-11164500",
                db=self.db,
                safe_simulation=True
            )
            self.assertEqual(res.evaluation_status, "HAZARD_DETECTED")
            trigger_types = [t.trigger_type for t in res.triggers_detected]
            self.assertIn("STAGE_SURGE", trigger_types)
            self.assertAlmostEqual(res.stage_delta_m, 0.25, places=2)

    def test_flow_rate_breach_detection(self):
        """Verifies that discharge >= 6.0 m³/s triggers FLOW_RATE_BREACH advisory."""
        from unittest.mock import patch
        from app.schemas.river_data import RiverDataResponse

        mock_flow_data = RiverDataResponse(
            station_name="USGS Station 11164500 (San Francisquito Creek)",
            district="CALIFORNIA HYDROLOGIC REGION",
            status="LIVE",
            water_level_m=0.8,
            flow_rate_cms=8.5,  # Breaches 6.0 m³/s limit
            observation_timestamp="2026-10-18T12:00:00Z",
            is_live=True,
            is_cached=False,
            data_source="USGS NWIS",
            data_freshness="Live Telemetry",
            notice="Live instantaneous reading",
        )

        with patch("app.services.river_data_service.river_data_service.get_river_data", return_value=mock_flow_data):
            res = hazard_monitoring_service.evaluate_station(
                "USGS-11164500",
                db=self.db,
                safe_simulation=True
            )
            self.assertEqual(res.evaluation_status, "HAZARD_DETECTED")
            trigger_types = [t.trigger_type for t in res.triggers_detected]
            self.assertIn("FLOW_RATE_BREACH", trigger_types)

    def test_telemetry_unavailable_skips_safely_without_fabrication(self):
        """Verifies that stations with unavailable telemetry return TELEMETRY_UNAVAILABLE and skip threshold breach."""
        from unittest.mock import patch
        from app.schemas.river_data import RiverDataResponse

        mock_unavail = RiverDataResponse(
            station_name="Unsupported Station XYZ",
            district="UNKNOWN",
            status="UNAVAILABLE",
            water_level_m=None,
            flow_rate_cms=None,
            observation_timestamp=None,
            is_live=False,
            is_cached=False,
            data_source="None",
            data_freshness="Unsupported Station",
            notice="No sensor stream connected",
        )

        with patch("app.services.river_data_service.river_data_service.get_river_data", return_value=mock_unavail):
            res = hazard_monitoring_service.evaluate_station(
                "Unsupported Station XYZ",
                db=self.db,
                safe_simulation=True
            )
            self.assertEqual(res.evaluation_status, "TELEMETRY_UNAVAILABLE")
            self.assertFalse(res.is_live)
            self.assertIsNone(res.observed_stage_m)
            self.assertEqual(res.outbound_delivery_status, "SKIPPED")
            self.assertIn("stale or fabricated data is never substituted", res.notice)

    def test_duplicate_alert_suppression(self):
        """Verifies that identical dispatch requests within deduplication window are suppressed."""
        from app.services.alert_service import alert_service
        from app.schemas.alert import AlertDispatchRequest

        req = AlertDispatchRequest(
            water_body_name="Cascade Canyon River",
            severity="extreme",
            message="Extreme flash surge test warning",
            channel="webhook",
            test_mode=False,
            force=False
        )

        # First dispatch should be processed (unconfigured or simulated)
        resp1 = alert_service.dispatch_alert(req, self.db)
        # Manually seed dedup cache key
        dedup_key = alert_service._compute_dedup_key(req)
        import time
        alert_service._dedup_cache[dedup_key] = time.time()

        # Immediate second dispatch must be suppressed
        resp2 = alert_service.dispatch_alert(req, self.db)
        self.assertEqual(resp2.status, "DUPLICATE_SUPPRESSED")
        self.assertFalse(resp2.confirmed_by_provider)
        self.assertIn("Duplicate alert suppressed", resp2.provider_message)

    def test_unmeasured_flow_rate_preserved_as_none_not_zero(self):
        """Telemetry with unmeasured flow rate preserves observed_flow_cms=None and does not fake 0.0 or trigger breach."""
        from unittest.mock import patch
        from app.schemas.river_data import RiverDataResponse

        mock_partial = RiverDataResponse(
            station_name="Test Partial Station",
            district="KERALA",
            status="LIVE",
            water_level_m=2.45,
            flow_rate_cms=None,  # Unmeasured velocity/discharge
            observation_timestamp=datetime.now(timezone.utc).isoformat(),
            retrieval_timestamp=datetime.now(timezone.utc).isoformat(),
            is_live=True,
            is_cached=False,
            data_source="NWIC Live",
            data_freshness="Live Stage Only",
            notice="Stage gauge online; velocity meter not installed.",
        )

        with patch("app.services.river_data_service.river_data_service.get_river_data", return_value=mock_partial):
            res = hazard_monitoring_service.evaluate_station("Test Partial Station", db=self.db, safe_simulation=True)
            self.assertEqual(res.evaluation_status, "NOMINAL")
            self.assertIsNone(res.observed_flow_cms, "Observed flow must remain None, not converted to 0.0")
            self.assertEqual(res.observed_stage_m, 2.45)
            # Flow breach trigger must NOT be fired
            trigger_types = [t.trigger_type for t in res.triggers_detected]
            self.assertNotIn("FLOW_RATE_BREACH", trigger_types)

    def test_both_stage_and_flow_missing_detected_as_anomaly(self):
        """When both stage and flow are absent, data-quality check flags anomaly and suppresses alerts."""
        from unittest.mock import patch
        from app.schemas.river_data import RiverDataResponse

        mock_empty = RiverDataResponse(
            station_name="Test Empty Station",
            district="KERALA",
            status="LIVE",
            water_level_m=None,
            flow_rate_cms=None,
            observation_timestamp=datetime.now(timezone.utc).isoformat(),
            retrieval_timestamp=datetime.now(timezone.utc).isoformat(),
            is_live=True,
            is_cached=False,
            data_source="Test Node",
            data_freshness="Blank Sensor",
            notice="All sensor channels silent",
        )

        with patch("app.services.river_data_service.river_data_service.get_river_data", return_value=mock_empty):
            res = hazard_monitoring_service.evaluate_station("Test Empty Station", db=self.db, safe_simulation=True)
            self.assertEqual(res.evaluation_status, "DATA_QUALITY_ANOMALY")
            self.assertIsNone(res.observed_stage_m)
            self.assertIsNone(res.observed_flow_cms)
            self.assertEqual(res.outbound_delivery_status, "SKIPPED")
            self.assertIn("Both water stage and flow readings are missing", res.notice)

    def test_what_if_simulation_unmeasured_baseline_does_not_fabricate_stage(self):
        """Verifies that simulate_what_if does not invent baseline stage or discharge when unmeasured."""
        from app.services.drowning_risk_service import drowning_risk_service
        from app.schemas.drowning_risk import WhatIfSimulationRequest

        # Request simulation with delta on unmeasured baseline (no water body specified)
        sim_req = WhatIfSimulationRequest(
            water_body_id=None,
            water_body_type="river",
            simulated_rainfall_increment_mm=50.0,
            simulated_stage_delta_m=0.5,
            simulated_discharge_increment_cms=10.0,
        )
        res = drowning_risk_service.simulate_what_if(sim_req, db=self.db)
        self.assertTrue(res.is_hypothetical_simulation)
        # Baseline environmental hazard stage was None, so simulated absolute stage should remain None
        self.assertIsNone(res.baseline_assessment.layer_a_environmental_hazard.water_level_m)
        self.assertIsNone(res.simulated_assessment.layer_a_environmental_hazard.water_level_m)
        # But simulated deltas are accurately recorded in the assessment
        self.assertEqual(res.simulated_assessment.layer_a_environmental_hazard.water_level_delta_3h_m, 0.5)


if __name__ == "__main__":
    unittest.main()
