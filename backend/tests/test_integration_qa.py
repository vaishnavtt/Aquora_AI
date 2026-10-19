"""
AQUORA AI - Backend Integration QA & Upstream Safety Test Suite
Covers:
- Task D: API Integration verification across all 5 core workflows
- Task E: NWIC credentials handling, live data safety, and provenance
- Task F: Alert deduplication, delivery audit logging, and failure handling
"""

import os
import sys
import json
import unittest
from unittest.mock import patch, MagicMock
import urllib.error
from datetime import datetime, timezone

from fastapi.testclient import TestClient

BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from app.main import app
from app.db.session import SessionLocal
from app.db.init_db import init_database
from app.models.alert_delivery import AlertDeliveryModel
from app.models.water_body import WaterBodyModel
from app.models.alert import AlertModel
from app.services.river_data_service import (
    LiveNWICProvider,
    OFFICIAL_SOURCE_AGENCY,
    STATION_CANONICAL,
    LATEST_HISTORICAL_RECORD,
)
from app.services.alert_service import AlertService, WebhookAlertProvider, EmailAlertProvider
from app.schemas.alert import AlertDispatchRequest
from app.services.hazard_monitoring_service import hazard_monitoring_service


class TestBackendIntegrationQA(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        init_database()

    def setUp(self):
        self.client = TestClient(app)
        self.db = SessionLocal()

    def tearDown(self):
        self.db.close()

    # ==========================================================================
    # WORKFLOW A: Water-Body Lookup
    # ==========================================================================

    def test_water_body_directory_retrieval(self):
        """Verifies GET /api/v1/water-bodies returns directory of monitored zones."""
        res = self.client.get("/api/v1/water-bodies")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIsInstance(data, list)
        self.assertGreaterEqual(len(data), 6)

        first = data[0]
        self.assertIn("id", first)
        self.assertIn("name", first)
        self.assertIn("type", first)
        self.assertIn("latitude", first)
        self.assertIn("longitude", first)
        self.assertIn("current_risk_level", first)
        self.assertIn("risk_score", first)
        self.assertIn("data_source", first)

    def test_water_body_filtering_by_type_and_risk(self):
        """Verifies filtering by water body type and risk level with strict enum validation."""
        # Valid type filter
        res_river = self.client.get("/api/v1/water-bodies?type=river")
        self.assertEqual(res_river.status_code, 200)
        rivers = res_river.json()
        for wb in rivers:
            self.assertEqual(wb["type"], "river")

        # Invalid type filter should return 422
        res_invalid = self.client.get("/api/v1/water-bodies?type=ocean_trench")
        self.assertEqual(res_invalid.status_code, 422)

        # Invalid risk_level filter should return 422
        res_invalid_risk = self.client.get("/api/v1/water-bodies?risk_level=apocalyptic")
        self.assertEqual(res_invalid_risk.status_code, 422)

    def test_water_body_lookup_by_id_found_and_not_found(self):
        """Verifies GET /api/v1/water-bodies/{id} returns 200 for valid ID and 404 for missing ID."""
        # 1. Valid ID
        res_found = self.client.get("/api/v1/water-bodies/1")
        self.assertEqual(res_found.status_code, 200)
        data = res_found.json()
        self.assertEqual(data["id"], 1)
        self.assertIn("name", data)

        # 2. Missing ID returns RFC 7807 compatible 404
        res_missing = self.client.get("/api/v1/water-bodies/999999")
        self.assertEqual(res_missing.status_code, 404)
        self.assertIn("Water body with ID 999999 not found", res_missing.json()["detail"])

    def test_water_body_lookup_by_coordinates(self):
        """Verifies GET /api/v1/water-bodies/by-coordinates proximity query."""
        res = self.client.get("/api/v1/water-bodies/by-coordinates?latitude=37.7749&longitude=-122.4194")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("Emerald", data["name"])

    # ==========================================================================
    # WORKFLOW B: Hazard Prediction & Input Bounds
    # ==========================================================================

    def test_hazard_prediction_valid_input_and_contract(self):
        """Verifies POST /api/v1/predict computes explainable risk assessment following contract."""
        payload = {
            "water_body_id": 1,
            "water_temp_c": 14.5,
            "flow_rate_cms": 7.5,
            "depth_meters": 3.5,
            "rainfall_last_24h_mm": 35.0,
            "wind_speed_kmh": 22.0,
            "visibility_meters": 2500.0,
            "include_ai_explanation": False,
        }
        res = self.client.post("/api/v1/predict", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()

        self.assertIn("risk_score", data)
        self.assertTrue(0.0 <= data["risk_score"] <= 100.0)
        self.assertIn(data["risk_level"], ["low", "moderate", "high", "extreme"])
        self.assertTrue(0.0 <= data["confidence"] <= 1.0)
        self.assertIsInstance(data["primary_hazards"], list)
        self.assertIsInstance(data["safety_recommendations"], list)
        self.assertEqual(data["model_version"], "baseline-heuristic-v0.1")
        self.assertTrue(data["is_baseline_model"])
        self.assertIsNone(data["ai_explanation"])

    def test_hazard_prediction_strict_boundary_validations(self):
        """Verifies boundary validations on input environmental dimensions."""
        base = {
            "flow_rate_cms": 1.0,
            "depth_meters": 2.0,
            "rainfall_last_24h_mm": 0.0,
            "wind_speed_kmh": 10.0,
            "visibility_meters": 3000.0,
        }
        # Water temp < -5.0
        res_low_temp = self.client.post("/api/v1/predict", json={**base, "water_temp_c": -6.0})
        self.assertEqual(res_low_temp.status_code, 422)

        # Water temp > 45.0
        res_high_temp = self.client.post("/api/v1/predict", json={**base, "water_temp_c": 46.0})
        self.assertEqual(res_high_temp.status_code, 422)

        # Depth < 0.1
        res_depth = self.client.post("/api/v1/predict", json={**base, "water_temp_c": 20.0, "depth_meters": 0.05})
        self.assertEqual(res_depth.status_code, 422)

        # Negative flow rate
        res_flow = self.client.post("/api/v1/predict", json={**base, "water_temp_c": 20.0, "flow_rate_cms": -1.0})
        self.assertEqual(res_flow.status_code, 422)

    def test_hazard_prediction_nonexistent_water_body_404(self):
        """Verifies specifying non-existent water_body_id returns 404."""
        payload = {
            "water_body_id": 888888,
            "water_temp_c": 18.0,
            "flow_rate_cms": 1.0,
            "depth_meters": 2.0,
            "rainfall_last_24h_mm": 0.0,
            "wind_speed_kmh": 5.0,
            "visibility_meters": 3000.0,
        }
        res = self.client.post("/api/v1/predict", json=payload)
        self.assertEqual(res.status_code, 404)
        self.assertIn("Water body with ID 888888 not found", res.json()["detail"])

    # ==========================================================================
    # WORKFLOW C: Water-Level Forecasting
    # ==========================================================================

    def test_water_level_forecasting_pipeline(self):
        """Verifies POST /api/v1/forecast/water-level accepts consecutive telemetry readings and returns forecast."""
        # 14 consecutive hourly telemetry readings
        from datetime import timedelta
        base_time = datetime(2025, 3, 10, 0, 0, tzinfo=timezone.utc)
        readings = [
            {
                "timestamp": (base_time + timedelta(hours=i)).isoformat(),
                "water_level_m": 2.10 + (i * 0.01),
            }
            for i in range(14)
        ]
        payload = {
            "station_name": "RAMAMANGALAM BRIDGE",
            "readings": readings,
        }
        res = self.client.post("/api/v1/forecast/water-level", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["station"], "RAMAMANGALAM BRIDGE")
        self.assertIn("forecasted_water_level_m", data)
        self.assertIn("persistence_baseline_m", data)
        self.assertIn("model_type", data)
        self.assertTrue(data["is_experimental"])

    def test_forecast_vs_observation_endpoint(self):
        """Verifies GET /api/v1/river-data/forecast-vs-observation/{station_name} returns historical validation comparison."""
        res = self.client.get("/api/v1/river-data/forecast-vs-observation/RAMAMANGALAM-BRIDGE?sample_size=10")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["station_name"], "RAMAMANGALAM BRIDGE")
        self.assertIn("comparisons", data)
        self.assertGreater(len(data["comparisons"]), 0)
        self.assertGreater(data["model_mae_m"], 0.0)
        self.assertGreater(data["baseline_persistence_mae_m"], 0.0)

    # ==========================================================================
    # WORKFLOW D: Executive Dashboard & Hazard Monitoring
    # ==========================================================================

    def test_dashboard_metrics_aggregation(self):
        """Verifies GET /api/v1/dashboard provides aggregated metrics from SQLite."""
        res = self.client.get("/api/v1/dashboard")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("total_monitored_sites", data)
        self.assertIn("high_risk_sites_count", data)
        self.assertIn("safe_sites_count", data)
        self.assertIn("system_status", data)
        self.assertIn("recent_alerts", data)

    def test_monitoring_immediate_sweep_and_status(self):
        """Verifies immediate hazard evaluation and scheduler status."""
        # Status
        res_status = self.client.get("/api/v1/monitoring/status")
        self.assertEqual(res_status.status_code, 200)
        data_status = res_status.json()
        self.assertIn("thresholds", data_status)
        self.assertIn("is_scheduler_running", data_status)

        # Immediate evaluation sweep
        res_eval = self.client.post("/api/v1/monitoring/evaluate", json={"safe_simulation_only": True})
        self.assertEqual(res_eval.status_code, 200)
        data_eval = res_eval.json()
        self.assertIsInstance(data_eval, list)
        self.assertGreater(len(data_eval), 0)
        self.assertIn("evaluation_status", data_eval[0])

    # ==========================================================================
    # TASK E: NWIC Credentials Handling & Live Data Safety
    # ==========================================================================

    def test_nwic_missing_credentials_returns_unavailable_safely(self):
        """
        Task E Test 1:
        Verifies that when NWIC credentials are missing or default placeholder,
        the application reports UNAVAILABLE status and NEVER invents live observations.
        """
        provider = LiveNWICProvider(api_key="")
        resp = provider.fetch_station_data("RAMAMANGALAM BRIDGE")

        self.assertEqual(resp.status, "UNAVAILABLE")
        self.assertFalse(resp.is_live)
        self.assertFalse(resp.is_cached)
        self.assertIsNone(resp.water_level_m)
        self.assertIsNone(resp.flow_rate_cms)
        self.assertIn("No authorized live telemetry API credentials configured", resp.notice)
        self.assertIn("nwdp.gov.in", resp.access_requirements)
        self.assertIsNotNone(resp.latest_historical_reading)
        self.assertEqual(resp.latest_historical_reading.water_level_m, 2.162)

    def test_nwic_credentials_configured_but_upstream_fails(self):
        """
        Task E Test 2:
        Verifies that when credentials are set but upstream network fails (URLError/timeout),
        the system reports UNAVAILABLE status gracefully without fabricating observations.
        """
        with patch("urllib.request.urlopen") as mock_urlopen:
            mock_urlopen.side_effect = urllib.error.URLError("Connection refused to nwdp.gov.in")

            provider = LiveNWICProvider(api_key="gov_registered_key_123")
            resp = provider.fetch_station_data("RAMAMANGALAM BRIDGE")

            self.assertEqual(resp.status, "UNAVAILABLE")
            self.assertFalse(resp.is_live)
            self.assertIsNone(resp.water_level_m)
            self.assertIn("could not be reached", resp.notice)
            self.assertIn("URLError", resp.notice)

    def test_nwic_upstream_malformed_response_handled_safely(self):
        """
        Task E Test 3:
        Verifies that malformed upstream responses (non-JSON, missing keys, or out-of-range readings)
        are caught and reported as UNAVAILABLE rather than crashing or using bogus numbers.
        """
        # Case A: Physically impossible water level (65m in 25m river reach)
        mock_payload_impossible = {
            "station_name": "RAMAMANGALAM BRIDGE",
            "water_level_m": 65.0,
            "observation_timestamp": "2026-10-18T10:00:00Z",
        }
        with patch("urllib.request.urlopen") as mock_urlopen:
            mock_resp = MagicMock()
            mock_resp.status = 200
            mock_resp.read.return_value = json.dumps(mock_payload_impossible).encode("utf-8")
            mock_resp.__enter__.return_value = mock_resp
            mock_urlopen.return_value = mock_resp

            provider = LiveNWICProvider(api_key="gov_registered_key_123")
            resp = provider.fetch_station_data("RAMAMANGALAM BRIDGE")

            self.assertEqual(resp.status, "UNAVAILABLE")
            self.assertFalse(resp.is_live)
            self.assertIsNone(resp.water_level_m)

        # Case B: Upstream returns invalid JSON
        with patch("urllib.request.urlopen") as mock_urlopen:
            mock_resp = MagicMock()
            mock_resp.status = 200
            mock_resp.read.return_value = b"<html>502 Bad Gateway</html>"
            mock_resp.__enter__.return_value = mock_resp
            mock_urlopen.return_value = mock_resp

            provider = LiveNWICProvider(api_key="gov_registered_key_123")
            resp = provider.fetch_station_data("RAMAMANGALAM BRIDGE")

            self.assertEqual(resp.status, "UNAVAILABLE")
            self.assertFalse(resp.is_live)
            self.assertIsNone(resp.water_level_m)

    def test_nwic_mocked_successful_upstream_response(self):
        """
        Task E Test 4:
        Verifies correct ingestion when upstream returns an authenticated, valid reading.
        """
        mock_payload = {
            "station_name": "RAMAMANGALAM BRIDGE",
            "water_level_m": 3.421,
            "flow_rate_cms": 12.8,
            "observation_timestamp": "2026-10-18T14:30:00+05:30",
        }
        with patch("urllib.request.urlopen") as mock_urlopen:
            mock_resp = MagicMock()
            mock_resp.status = 200
            mock_resp.read.return_value = json.dumps(mock_payload).encode("utf-8")
            mock_resp.__enter__.return_value = mock_resp
            mock_urlopen.return_value = mock_resp

            provider = LiveNWICProvider(api_key="valid_token_xyz")
            resp = provider.fetch_station_data("RAMAMANGALAM BRIDGE")

            self.assertEqual(resp.status, "LIVE")
            self.assertTrue(resp.is_live)
            self.assertEqual(resp.water_level_m, 3.421)
            self.assertEqual(resp.flow_rate_cms, 12.8)
            self.assertIn("Live telemetry feed authenticated", resp.notice)

    def test_nwic_provenance_and_no_credential_leakage(self):
        """
        Task E Test 5:
        Verifies that data provenance is accurately attributed to the official agency,
        and that secret keys are never leaked in notice, access_requirements, or error messages.
        """
        secret_key = "super_secret_gov_token_98765"
        provider = LiveNWICProvider(api_key=secret_key)

        with patch("urllib.request.urlopen") as mock_urlopen:
            mock_urlopen.side_effect = urllib.error.URLError("Upstream network timeout")
            resp = provider.fetch_station_data("RAMAMANGALAM BRIDGE")

            # Check provenance attribution
            self.assertEqual(resp.data_source, OFFICIAL_SOURCE_AGENCY)
            # Confirm credentials never appear in output text
            resp_str = json.dumps(resp.model_dump(), default=str)
            self.assertNotIn(secret_key, resp_str)

    # ==========================================================================
    # TASK F: Alert Deduplication & Delivery Logging
    # ==========================================================================

    def test_alert_repeated_request_deduplication(self):
        """
        Task F:
        Verifies that identical dispatch requests within the throttling window (60s)
        are flagged as DUPLICATE_SUPPRESSED and not re-sent.
        """
        service = AlertService(dedup_window_seconds=60.0)
        req = AlertDispatchRequest(
            water_body_name="Cascade Canyon River",
            severity="extreme",
            message="Flash surge warning: velocity 10.5 m3/s",
            channel="webhook",
            recipient="https://incident.local/webhook",
            test_mode=False,
            force=False,
        )

        with patch("urllib.request.urlopen") as mock_urlopen:
            mock_resp = MagicMock()
            mock_resp.status = 200
            mock_resp.read.return_value = b'{"accepted": true}'
            mock_resp.__enter__.return_value = mock_resp
            mock_urlopen.return_value = mock_resp

            # First dispatch
            resp1 = service.dispatch_alert(req, self.db)
            self.assertEqual(resp1.status, "DELIVERED")
            self.assertTrue(resp1.confirmed_by_provider)

            # Second identical dispatch within window
            resp2 = service.dispatch_alert(req, self.db)
            self.assertEqual(resp2.status, "DUPLICATE_SUPPRESSED")
            self.assertFalse(resp2.confirmed_by_provider)
            self.assertIn("Duplicate alert suppressed", resp2.provider_message)

            # Third dispatch with force=True bypasses suppression
            req_forced = AlertDispatchRequest(
                water_body_name="Cascade Canyon River",
                severity="extreme",
                message="Flash surge warning: velocity 10.5 m3/s",
                channel="webhook",
                recipient="https://incident.local/webhook",
                test_mode=False,
                force=True,
            )
            resp3 = service.dispatch_alert(req_forced, self.db)
            self.assertEqual(resp3.status, "DELIVERED")
            self.assertTrue(resp3.confirmed_by_provider)

    def test_distinct_hazards_produce_separate_alerts(self):
        """
        Task F:
        Verifies that distinct hazards (e.g. cold shock vs flash surge) for the
        SAME water body produce separate alerts and are NOT suppressed.
        """
        service = AlertService(dedup_window_seconds=60.0)

        req_surge = AlertDispatchRequest(
            water_body_name="Cascade Canyon River",
            severity="high",
            message="Stage surge warning (+0.25m rise)",
            channel="webhook",
            recipient="https://incident.local/webhook",
            test_mode=False,
        )
        req_cold = AlertDispatchRequest(
            water_body_name="Cascade Canyon River",
            severity="extreme",
            message="Severe cold shock alert (water temp 4.0C)",
            channel="webhook",
            recipient="https://incident.local/webhook",
            test_mode=False,
        )

        with patch("urllib.request.urlopen") as mock_urlopen:
            mock_resp = MagicMock()
            mock_resp.status = 200
            mock_resp.read.return_value = b'{"ok": true}'
            mock_resp.__enter__.return_value = mock_resp
            mock_urlopen.return_value = mock_resp

            resp_surge = service.dispatch_alert(req_surge, self.db)
            resp_cold = service.dispatch_alert(req_cold, self.db)

            # Both should be DELIVERED, not suppressed
            self.assertEqual(resp_surge.status, "DELIVERED")
            self.assertEqual(resp_cold.status, "DELIVERED")
            self.assertNotEqual(resp_surge.delivery_id, resp_cold.delivery_id)

    def test_delivery_audit_logging_success_and_failure(self):
        """
        Task F:
        Verifies that both successful and failed delivery attempts are persisted
        to AlertDeliveryModel in SQLite with complete audit fields.
        """
        service = AlertService()

        # 1. Success case
        with patch("urllib.request.urlopen") as mock_urlopen:
            mock_resp = MagicMock()
            mock_resp.status = 200
            mock_resp.read.return_value = b'{"incident_id": "INC-445"}'
            mock_resp.__enter__.return_value = mock_resp
            mock_urlopen.return_value = mock_resp

            req_success = AlertDispatchRequest(
                water_body_name="Emerald Bay Reservoir",
                severity="moderate",
                message="Flow velocity test",
                channel="webhook",
                recipient="https://incident.local/webhook",
                test_mode=False,
            )
            resp_success = service.dispatch_alert(req_success, self.db)

            # Check database persistence
            rec_success = self.db.query(AlertDeliveryModel).filter_by(id=resp_success.delivery_id).first()
            self.assertIsNotNone(rec_success)
            self.assertEqual(rec_success.status, "DELIVERED")
            self.assertTrue(rec_success.confirmed_by_provider)
            self.assertIn("INC-445", rec_success.provider_message)

        # 2. Failure case (upstream returns 503 Service Unavailable)
        with patch("urllib.request.urlopen") as mock_urlopen:
            mock_resp = MagicMock()
            mock_resp.status = 503
            mock_resp.__enter__.return_value = mock_resp
            mock_urlopen.return_value = mock_resp

            req_fail = AlertDispatchRequest(
                water_body_name="Emerald Bay Reservoir",
                severity="moderate",
                message="Failure audit test",
                channel="webhook",
                recipient="https://incident.local/webhook",
                test_mode=False,
                force=True,
            )
            resp_fail = service.dispatch_alert(req_fail, self.db)

            # Check database persistence
            rec_fail = self.db.query(AlertDeliveryModel).filter_by(id=resp_fail.delivery_id).first()
            self.assertIsNotNone(rec_fail)
            self.assertEqual(rec_fail.status, "FAILED")
            self.assertFalse(rec_fail.confirmed_by_provider)
            self.assertIn("503", rec_fail.provider_message)

    def test_unconfigured_credentials_produces_explicit_unconfigured_state(self):
        """
        Task F:
        Verifies that missing webhook or SMTP configuration produces an explicit
        UNCONFIGURED state and is never claimed as delivered.
        """
        provider_webhook = WebhookAlertProvider(default_url="")
        req = AlertDispatchRequest(
            water_body_name="Emerald Bay Reservoir",
            severity="low",
            message="Unconfigured channel test",
            channel="webhook",
            recipient="",
            test_mode=False,
        )
        status, confirmed, msg, target = provider_webhook.send(req, is_test_mode=False)
        self.assertEqual(status, "UNCONFIGURED")
        self.assertFalse(confirmed)
        self.assertIn("No webhook destination configured", msg)


if __name__ == "__main__":
    unittest.main()
