import os
import sys
import json
import unittest
from unittest.mock import patch, MagicMock
import urllib.error
from fastapi.testclient import TestClient

BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from app.main import app
from app.services.river_data_service import (
    LiveUSGSProvider,
    LiveNWICProvider,
    HistoricalRiverDataProvider,
    RiverDataService,
    STATION_CANONICAL,
    LATEST_HISTORICAL_RECORD,
)


class TestRiverDataService(unittest.TestCase):

    def setUp(self):
        self.client = TestClient(app)

    def test_live_usgs_provider_parses_valid_payload(self):
        mock_payload = {
            "value": {
                "timeSeries": [
                    {
                        "sourceInfo": {"siteName": "SAN FRANCISQUITO CREEK AT STANFORD CA"},
                        "variable": {"variableCode": [{"value": "00065"}]},
                        "values": [
                            {
                                "value": [
                                    {"value": "1.50", "dateTime": "2026-10-18T09:00:00.000-07:00"}
                                ]
                            }
                        ],
                    },
                    {
                        "sourceInfo": {"siteName": "SAN FRANCISQUITO CREEK AT STANFORD CA"},
                        "variable": {"variableCode": [{"value": "00060"}]},
                        "values": [
                            {
                                "value": [
                                    {"value": "35.2", "dateTime": "2026-10-18T09:00:00.000-07:00"}
                                ]
                            }
                        ],
                    },
                ]
            }
        }

        with patch("urllib.request.urlopen") as mock_urlopen:
            mock_resp = MagicMock()
            mock_resp.status = 200
            mock_resp.read.return_value = json.dumps(mock_payload).encode("utf-8")
            mock_resp.__enter__.return_value = mock_resp
            mock_urlopen.return_value = mock_resp

            provider = LiveUSGSProvider()
            resp = provider.fetch_station_data("11164500")

            self.assertEqual(resp.status, "LIVE")
            self.assertTrue(resp.is_live)
            self.assertFalse(resp.is_cached)
            # 1.50 feet * 0.3048 = 0.4572 meters
            self.assertAlmostEqual(resp.water_level_m, 0.4572, places=4)
            # 35.2 cfs * 0.0283168 = 0.9968 cms
            self.assertAlmostEqual(resp.flow_rate_cms, 0.9968, places=4)
            self.assertEqual(resp.observation_timestamp, "2026-10-18T09:00:00.000-07:00")
            self.assertIn("USGS", resp.data_source)

    def test_live_usgs_provider_handles_empty_timeseries(self):
        mock_payload = {"value": {"timeSeries": []}}

        with patch("urllib.request.urlopen") as mock_urlopen:
            mock_resp = MagicMock()
            mock_resp.status = 200
            mock_resp.read.return_value = json.dumps(mock_payload).encode("utf-8")
            mock_resp.__enter__.return_value = mock_resp
            mock_urlopen.return_value = mock_resp

            provider = LiveUSGSProvider()
            resp = provider.fetch_station_data("11164500")

            self.assertEqual(resp.status, "UNAVAILABLE")
            self.assertFalse(resp.is_live)
            self.assertIsNone(resp.water_level_m)
            self.assertIn("No active timeSeries records", resp.notice)

    def test_live_usgs_provider_handles_timeout_and_network_error(self):
        with patch("urllib.request.urlopen") as mock_urlopen:
            mock_urlopen.side_effect = urllib.error.URLError("Connection timed out")

            provider = LiveUSGSProvider()
            resp = provider.fetch_station_data("11164500")

            self.assertEqual(resp.status, "UNAVAILABLE")
            self.assertFalse(resp.is_live)
            self.assertIsNone(resp.water_level_m)
            self.assertIn("could not be reached", resp.notice)

    def test_live_usgs_provider_caching(self):
        mock_payload = {
            "value": {
                "timeSeries": [
                    {
                        "sourceInfo": {"siteName": "TEST CREEK"},
                        "variable": {"variableCode": [{"value": "00065"}]},
                        "values": [{"value": [{"value": "2.0", "dateTime": "2026-10-18T10:00:00Z"}]}],
                    }
                ]
            }
        }
        with patch("urllib.request.urlopen") as mock_urlopen:
            mock_resp = MagicMock()
            mock_resp.status = 200
            mock_resp.read.return_value = json.dumps(mock_payload).encode("utf-8")
            mock_resp.__enter__.return_value = mock_resp
            mock_urlopen.return_value = mock_resp

            provider = LiveUSGSProvider(cache_ttl_seconds=300.0)
            resp1 = provider.fetch_station_data("99999999")
            self.assertEqual(resp1.status, "LIVE")
            self.assertFalse(resp1.is_cached)

            # Second call should return cached response without calling urlopen again
            resp2 = provider.fetch_station_data("99999999")
            self.assertEqual(resp2.status, "LIVE")
            self.assertTrue(resp2.is_cached)
            self.assertEqual(mock_urlopen.call_count, 1)

    def test_live_nwic_provider_unconfigured_credentials(self):
        provider = LiveNWICProvider(api_key="")
        resp = provider.fetch_station_data("RAMAMANGALAM BRIDGE")

        self.assertEqual(resp.status, "UNAVAILABLE")
        self.assertFalse(resp.is_live)
        self.assertIsNone(resp.water_level_m)
        self.assertIn("No authorized live telemetry API credentials", resp.notice)
        self.assertIn("nwdp.gov.in", resp.access_requirements)
        self.assertIsNotNone(resp.latest_historical_reading)
        self.assertEqual(resp.latest_historical_reading.water_level_m, 2.162)

    def test_live_nwic_provider_authenticated_success(self):
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

            provider = LiveNWICProvider(api_key="valid_nwic_government_token_xyz")
            resp = provider.fetch_station_data("RAMAMANGALAM BRIDGE")

            self.assertEqual(resp.status, "LIVE")
            self.assertTrue(resp.is_live)
            self.assertEqual(resp.water_level_m, 3.421)
            self.assertEqual(resp.flow_rate_cms, 12.8)
            self.assertIn("Live telemetry feed authenticated", resp.notice)

    def test_live_nwic_provider_out_of_plausible_range(self):
        # A 65-meter water level in a 25m river bed indicates sensor distortion
        mock_payload = {
            "station_name": "RAMAMANGALAM BRIDGE",
            "water_level_m": 65.0,
            "observation_timestamp": "2026-10-18T14:30:00+05:30",
        }

        with patch("urllib.request.urlopen") as mock_urlopen:
            mock_resp = MagicMock()
            mock_resp.status = 200
            mock_resp.read.return_value = json.dumps(mock_payload).encode("utf-8")
            mock_resp.__enter__.return_value = mock_resp
            mock_urlopen.return_value = mock_resp

            provider = LiveNWICProvider(api_key="valid_token")
            resp = provider.fetch_station_data("RAMAMANGALAM BRIDGE")

            self.assertEqual(resp.status, "UNAVAILABLE")
            self.assertFalse(resp.is_live)
            self.assertIsNone(resp.water_level_m)

    def test_historical_provider_returns_archive_record(self):
        provider = HistoricalRiverDataProvider()
        resp = provider.fetch_station_data("RAMAMANGALAM BRIDGE")

        self.assertEqual(resp.status, "HISTORICAL")
        self.assertFalse(resp.is_live)
        self.assertEqual(resp.water_level_m, 2.162)
        self.assertEqual(resp.observation_timestamp, LATEST_HISTORICAL_RECORD["timestamp"])
        self.assertIn("HISTORICAL DEMONSTRATION DATA", resp.notice)

    def test_river_data_service_routing(self):
        service = RiverDataService()

        # Historical mode query
        resp_hist = service.get_river_data("RAMAMANGALAM-BRIDGE", mode="historical")
        self.assertEqual(resp_hist.status, "HISTORICAL")
        self.assertEqual(resp_hist.water_level_m, 2.162)

        # Unsupported station
        resp_unsupported = service.get_river_data("NONEXISTENT_STATION_XYZ")
        self.assertEqual(resp_unsupported.status, "UNAVAILABLE")
        self.assertIn("Unsupported Station", resp_unsupported.data_freshness)

    def test_api_river_data_endpoints(self):
        # 1. USGS Station via API
        res_usgs = self.client.get("/api/v1/river-data/USGS-11164500")
        self.assertEqual(res_usgs.status_code, 200)
        data_usgs = res_usgs.json()
        self.assertIn("status", data_usgs)
        self.assertIn(data_usgs["status"], ["LIVE", "CACHED", "UNAVAILABLE"])

        # 2. Ramamangalam Bridge Historical Mode via API
        res_hist = self.client.get("/api/v1/river-data/RAMAMANGALAM-BRIDGE?mode=historical")
        self.assertEqual(res_hist.status_code, 200)
        data_hist = res_hist.json()
        self.assertEqual(data_hist["status"], "HISTORICAL")
        self.assertEqual(data_hist["water_level_m"], 2.162)


if __name__ == "__main__":
    unittest.main()
