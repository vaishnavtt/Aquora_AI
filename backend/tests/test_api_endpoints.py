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
        from app.db.init_db import init_database
        init_database()
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

if __name__ == "__main__":
    unittest.main()

