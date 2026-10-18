import os
import sys
import unittest
from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient

BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from app.main import app

class TestAPIEndpoints(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)

    def test_health_endpoint(self):
        res = self.client.get("/api/v1/health")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["status"], "healthy")
        self.assertIn("database", data)

    def test_operational_predict_endpoint_untouched(self):
        payload = {
            "water_temp_c": 14.0,
            "flow_rate_cms": 7.5,
            "depth_meters": 3.0,
            "rainfall_last_24h_mm": 20.0,
            "wind_speed_kmh": 22.0,
            "visibility_meters": 2500.0
        }
        res = self.client.post("/api/v1/predict", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("risk_score", data)
        self.assertIn("risk_level", data)

    def test_forecast_water_level_success(self):
        base_time = datetime(2024, 6, 1, 10, 0, 0, tzinfo=timezone.utc)
        readings = [
            {
                "timestamp": (base_time + timedelta(hours=i)).isoformat(),
                "water_level_m": round(4.0 + 0.02 * i, 4)
            }
            for i in range(13)
        ]
        payload = {
            "station_name": "RAMAMANGALAM BRIDGE",
            "readings": readings
        }
        res = self.client.post("/api/v1/forecast/water-level", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["station"], "RAMAMANGALAM BRIDGE")
        self.assertEqual(data["current_water_level_m"], 4.24)
        self.assertEqual(data["persistence_baseline_m"], 4.24)
        self.assertIn("forecasted_water_level_m", data)
        self.assertIn("predicted_delta_m", data)
        self.assertTrue(data["is_experimental"])

    def test_forecast_water_level_wrong_station_rejected(self):
        base_time = datetime(2024, 6, 1, 10, 0, 0, tzinfo=timezone.utc)
        readings = [
            {
                "timestamp": (base_time + timedelta(hours=i)).isoformat(),
                "water_level_m": 4.0
            }
            for i in range(13)
        ]
        payload = {
            "station_name": "UNKNOWN RIVER",
            "readings": readings
        }
        res = self.client.post("/api/v1/forecast/water-level", json=payload)
        self.assertEqual(res.status_code, 400)
        self.assertIn("exclusively for 'RAMAMANGALAM BRIDGE'", res.json()["detail"])

    def test_forecast_water_level_irregular_interval_rejected(self):
        base_time = datetime(2024, 6, 1, 10, 0, 0, tzinfo=timezone.utc)
        readings = [
            {
                "timestamp": (base_time + timedelta(hours=i)).isoformat(),
                "water_level_m": 4.0
            }
            for i in range(13)
        ]
        # Introduce a 20-minute gap instead of 60 minutes
        readings[5]["timestamp"] = (base_time + timedelta(hours=4, minutes=20)).isoformat()
        payload = {
            "station_name": "RAMAMANGALAM BRIDGE",
            "readings": readings
        }
        res = self.client.post("/api/v1/forecast/water-level", json=payload)
        self.assertEqual(res.status_code, 400)
        self.assertIn("hourly interval constraint", res.json()["detail"])

    def test_river_data_ramamangalam_bridge_endpoint(self):
        res = self.client.get("/api/v1/river-data/RAMAMANGALAM-BRIDGE")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["station_name"], "RAMAMANGALAM BRIDGE")
        self.assertIn(data["status"], ["LIVE", "CACHED", "HISTORICAL", "UNAVAILABLE"])
        self.assertIn("data_source", data)
        self.assertIn("data_freshness", data)
        self.assertIn("latest_historical_reading", data)
        if data["latest_historical_reading"]:
            self.assertGreater(data["latest_historical_reading"]["water_level_m"], 0.0)
            self.assertIn(data["latest_historical_reading"]["water_level_m"], [2.162, 3.52])

    def test_river_data_historical_mode(self):
        res = self.client.get("/api/v1/river-data/RAMAMANGALAM-BRIDGE?mode=historical")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["status"], "HISTORICAL")
        self.assertEqual(data["station_name"], "RAMAMANGALAM BRIDGE")
        self.assertFalse(data["is_live"])
        self.assertIsNotNone(data["water_level_m"])
        self.assertEqual(data["water_level_m"], 2.162)

    def test_get_water_bodies_endpoint(self):
        res = self.client.get("/api/v1/water-bodies")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIsInstance(data, list)
        self.assertGreater(len(data), 0)
        self.assertIn("name", data[0])
        self.assertIn("current_risk_level", data[0])

    def test_get_dashboard_endpoint(self):
        res = self.client.get("/api/v1/dashboard")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("total_monitored_sites", data)
        self.assertIn("high_risk_sites_count", data)
        self.assertIn("safe_sites_count", data)
        self.assertIn("recent_alerts", data)

    def test_alerts_dispatch_endpoint_safe_mode(self):
        payload = {
            "water_body_name": "Cascade Canyon River",
            "severity": "high",
            "message": "Water velocity elevated past safe recreational threshold.",
            "channel": "webhook",
            "test_mode": True
        }
        res = self.client.post("/api/v1/alerts/dispatch", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["status"], "TEST_MODE_SIMULATED")
        self.assertFalse(data["confirmed_by_provider"])
        self.assertTrue(data["test_mode"])
        self.assertIn("Safe test mode", data["notice"])

    def test_alerts_deliveries_and_status_endpoints(self):
        res_status = self.client.get("/api/v1/alerts/status")
        self.assertEqual(res_status.status_code, 200)
        status_data = res_status.json()
        self.assertIn("webhook_configured", status_data)
        self.assertIn("email_configured", status_data)

        res_del = self.client.get("/api/v1/alerts/deliveries?limit=10")
        self.assertEqual(res_del.status_code, 200)
        del_data = res_del.json()
        self.assertIsInstance(del_data, list)

    def test_get_water_body_by_id_success(self):
        res = self.client.get("/api/v1/water-bodies/1")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["id"], 1)
        self.assertIn("elevation_meters", data)
        self.assertIn("basin_region", data)
        self.assertIn("data_source", data)

    def test_get_water_body_by_id_not_found(self):
        res = self.client.get("/api/v1/water-bodies/999999")
        self.assertEqual(res.status_code, 404)
        self.assertIn("not found in monitored database", res.json()["detail"])

    def test_get_water_body_by_coordinates_success(self):
        # Emerald Lake coordinates: 37.7749, -122.4194
        res = self.client.get("/api/v1/water-bodies/by-coordinates?latitude=37.775&longitude=-122.419")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("Emerald", data["name"])

    def test_get_water_body_by_coordinates_unsupported(self):
        # Middle of Sahara coordinates: 20.0, 10.0
        res = self.client.get("/api/v1/water-bodies/by-coordinates?latitude=20.0&longitude=10.0")
        self.assertEqual(res.status_code, 404)
        detail = res.json()["detail"]
        self.assertIn("No monitored water body found", detail)
        self.assertIn("does not assign fabricated environmental observations", detail)

    def test_environmental_data_pipeline_audit(self):
        res = self.client.get("/api/v1/environmental-data/1")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("dimensions", data)
        dims = data["dimensions"]
        # Verify Rainfall is UNAVAILABLE (not fabricated)
        self.assertEqual(dims["rainfall"]["status"], "UNAVAILABLE")
        self.assertIsNone(dims["rainfall"]["value"])
        # Verify Historical incidents are UNAVAILABLE (not fabricated)
        self.assertEqual(dims["historical_incidents"]["status"], "UNAVAILABLE")
        self.assertIsNone(dims["historical_incidents"]["value"])
        # Verify water level and metadata are present
        self.assertIn(dims["water_level"]["status"], ["AVAILABLE_STATIC", "AVAILABLE_LIVE", "AVAILABLE_HISTORICAL"])
        self.assertEqual(dims["water_body_type"]["status"], "AVAILABLE_STATIC")

    def test_river_data_history_endpoint(self):
        res = self.client.get("/api/v1/river-data/history/RAMAMANGALAM-BRIDGE?limit=10")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["station_name"], "RAMAMANGALAM BRIDGE")
        self.assertEqual(data["status"], "AVAILABLE_HISTORICAL")
        self.assertIsInstance(data["readings"], list)
        self.assertGreater(len(data["readings"]), 0)

    def test_river_data_forecast_vs_observation_endpoint(self):
        res = self.client.get("/api/v1/river-data/forecast-vs-observation/RAMAMANGALAM-BRIDGE?sample_size=10")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["station_name"], "RAMAMANGALAM BRIDGE")
        self.assertIn("RidgeRegressor", data["model_name"])
        self.assertIsInstance(data["comparisons"], list)
        self.assertGreater(len(data["comparisons"]), 0)
        self.assertGreater(data["model_mae_m"], 0.0)
        self.assertGreater(data["baseline_persistence_mae_m"], 0.0)

    def test_monitoring_evaluate_endpoint(self):
        payload = {"safe_simulation_only": True}
        res = self.client.post("/api/v1/monitoring/evaluate", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIsInstance(data, list)
        self.assertGreater(len(data), 0)

    def test_monitoring_status_and_scheduler_lifecycle(self):
        res_status = self.client.get("/api/v1/monitoring/status")
        self.assertEqual(res_status.status_code, 200)
        status_data = res_status.json()
        self.assertIn("is_scheduler_running", status_data)
        self.assertIn("thresholds", status_data)

        # Start scheduler
        res_start = self.client.post("/api/v1/monitoring/start?interval_seconds=60")
        self.assertEqual(res_start.status_code, 200)
        self.assertTrue(res_start.json()["is_scheduler_running"])

        # Stop scheduler
        res_stop = self.client.post("/api/v1/monitoring/stop")
        self.assertEqual(res_stop.status_code, 200)
        self.assertFalse(res_stop.json()["is_scheduler_running"])

if __name__ == "__main__":
    unittest.main()


