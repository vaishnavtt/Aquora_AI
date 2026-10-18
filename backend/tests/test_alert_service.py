import os
import sys
import unittest
import urllib.error
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient

BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from app.main import app
from app.db.session import SessionLocal
from app.services.alert_service import AlertService, WebhookAlertProvider, EmailAlertProvider
from app.schemas.alert import AlertDispatchRequest, AlertTestRequest

class TestAlertService(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        from app.db.init_db import init_database
        init_database()

    def setUp(self):
        self.client = TestClient(app)
        self.db = SessionLocal()
        self.service = AlertService()

    def tearDown(self):
        self.db.close()

    def test_webhook_safe_test_mode(self):
        req = AlertDispatchRequest(
            water_body_name="Cascade Canyon River",
            severity="high",
            message="Test high flow alert",
            channel="webhook",
            test_mode=True
        )
        resp = self.service.dispatch_alert(req, self.db)
        self.assertEqual(resp.status, "TEST_MODE_SIMULATED")
        self.assertFalse(resp.confirmed_by_provider)
        self.assertTrue(resp.test_mode)
        self.assertIn("Safe Test Mode", resp.provider_message)

    def test_email_safe_test_mode(self):
        req = AlertDispatchRequest(
            water_body_name="Cascade Canyon River",
            severity="extreme",
            message="Test hypothermia alert",
            channel="email",
            recipient="officer@safety.gov",
            test_mode=True
        )
        resp = self.service.dispatch_alert(req, self.db)
        self.assertEqual(resp.status, "TEST_MODE_SIMULATED")
        self.assertFalse(resp.confirmed_by_provider)
        self.assertTrue(resp.test_mode)
        self.assertEqual(resp.recipient, "officer@safety.gov")

    def test_webhook_unconfigured(self):
        provider = WebhookAlertProvider(default_url="")
        req = AlertDispatchRequest(
            water_body_name="Cascade Canyon River",
            severity="high",
            message="Unconfigured webhook test",
            channel="webhook",
            recipient="",
            test_mode=False
        )
        status, confirmed, msg, target = provider.send(req, is_test_mode=False)
        self.assertEqual(status, "UNCONFIGURED")
        self.assertFalse(confirmed)
        self.assertIn("No webhook destination configured", msg)

    def test_email_unconfigured(self):
        provider = EmailAlertProvider(host="", default_to="")
        req = AlertDispatchRequest(
            water_body_name="Cascade Canyon River",
            severity="high",
            message="Unconfigured email test",
            channel="email",
            test_mode=False
        )
        status, confirmed, msg, target = provider.send(req, is_test_mode=False)
        self.assertEqual(status, "UNCONFIGURED")
        self.assertFalse(confirmed)

    @patch("urllib.request.urlopen")
    def test_webhook_confirmed_delivery(self, mock_urlopen):
        mock_resp = MagicMock()
        mock_resp.status = 200
        mock_resp.read.return_value = b'{"status": "queued", "id": "incident-889"}'
        mock_resp.__enter__.return_value = mock_resp
        mock_urlopen.return_value = mock_resp

        provider = WebhookAlertProvider(default_url="https://dispatch.local/api/alerts")
        req = AlertDispatchRequest(
            water_body_name="Cascade Canyon River",
            severity="high",
            message="Flash flood surge alert",
            channel="webhook",
            test_mode=False
        )
        status, confirmed, msg, target = provider.send(req, is_test_mode=False)
        self.assertEqual(status, "DELIVERED")
        self.assertTrue(confirmed)
        self.assertIn("confirmed receipt (HTTP 200)", msg)

    @patch("urllib.request.urlopen")
    def test_webhook_failed_delivery(self, mock_urlopen):
        mock_resp = MagicMock()
        mock_resp.status = 503
        mock_resp.__enter__.return_value = mock_resp
        mock_urlopen.return_value = mock_resp

        provider = WebhookAlertProvider(default_url="https://dispatch.local/api/alerts")
        req = AlertDispatchRequest(
            water_body_name="Cascade Canyon River",
            severity="high",
            message="Service unavailable test",
            channel="webhook",
            test_mode=False
        )
        status, confirmed, msg, target = provider.send(req, is_test_mode=False)
        self.assertEqual(status, "FAILED")
        self.assertFalse(confirmed)

    @patch("smtplib.SMTP")
    def test_email_confirmed_delivery(self, mock_smtp):
        mock_server = MagicMock()
        mock_server.has_extn.return_value = False
        mock_server.send_message.return_value = {}  # Empty dict means all recipients accepted
        mock_smtp.return_value = mock_server

        provider = EmailAlertProvider(
            host="smtp.dispatch.local",
            port=587,
            default_to="patrol@aquora.local"
        )
        req = AlertDispatchRequest(
            water_body_name="Cascade Canyon River",
            severity="high",
            message="Emergency alert email",
            channel="email",
            test_mode=False
        )
        status, confirmed, msg, target = provider.send(req, is_test_mode=False)
        self.assertEqual(status, "DELIVERED")
        self.assertTrue(confirmed)
        self.assertIn("accepted message", msg)

    def test_api_alert_dispatch_endpoint(self):
        payload = {
            "water_body_name": "Blackwood Gorge",
            "severity": "extreme",
            "message": "Water temperature dropped to 8.5C with violent 16 m3/s current.",
            "channel": "webhook",
            "test_mode": True
        }
        res = self.client.post("/api/v1/alerts/dispatch", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("delivery_id", data)
        self.assertEqual(data["status"], "TEST_MODE_SIMULATED")
        self.assertFalse(data["confirmed_by_provider"])
        self.assertTrue(data["test_mode"])

    def test_api_alert_deliveries_endpoint(self):
        res = self.client.get("/api/v1/alerts/deliveries?limit=5")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIsInstance(data, list)
        if len(data) > 0:
            self.assertIn("id", data[0])
            self.assertIn("status", data[0])
            self.assertIn("confirmed_by_provider", data[0])

    def test_api_alert_status_endpoint(self):
        res = self.client.get("/api/v1/alerts/status")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("webhook_configured", data)
        self.assertIn("email_configured", data)
        self.assertIn("test_mode_enforced", data)

    @patch("urllib.request.urlopen")
    def test_webhook_timeout_handling(self, mock_urlopen):
        mock_urlopen.side_effect = urllib.error.URLError("Connection timed out")
        provider = WebhookAlertProvider(default_url="https://dispatch.local/api/alerts")
        req = AlertDispatchRequest(
            water_body_name="Cascade Canyon River",
            severity="high",
            message="Flash flood surge timeout test",
            channel="webhook",
            test_mode=False
        )
        status, confirmed, msg, target = provider.send(req, is_test_mode=False)
        self.assertEqual(status, "FAILED")
        self.assertFalse(confirmed)
        self.assertIn("timed out", msg.lower())

    @patch("urllib.request.urlopen")
    def test_deduplication_suppression_and_override(self, mock_urlopen):
        mock_resp = MagicMock()
        mock_resp.status = 200
        mock_resp.read.return_value = b'{"ok": true}'
        mock_resp.__enter__.return_value = mock_resp
        mock_urlopen.return_value = mock_resp

        service = AlertService(dedup_window_seconds=60.0)
        req = AlertDispatchRequest(
            water_body_name="Blackwood Gorge",
            severity="extreme",
            message="Duplicate test hazard alert",
            channel="webhook",
            recipient="https://dispatch.local/alerts",
            test_mode=False
        )

        # First dispatch should be DELIVERED
        resp1 = service.dispatch_alert(req, self.db)
        self.assertEqual(resp1.status, "DELIVERED")
        self.assertTrue(resp1.confirmed_by_provider)

        # Second identical dispatch within 60s should be DUPLICATE_SUPPRESSED
        resp2 = service.dispatch_alert(req, self.db)
        self.assertEqual(resp2.status, "DUPLICATE_SUPPRESSED")
        self.assertFalse(resp2.confirmed_by_provider)
        self.assertIn("throttling window", resp2.provider_message)

        # Dispatch with force=True should override suppression
        req_forced = AlertDispatchRequest(
            water_body_name="Blackwood Gorge",
            severity="extreme",
            message="Duplicate test hazard alert",
            channel="webhook",
            recipient="https://dispatch.local/alerts",
            test_mode=False,
            force=True
        )
        resp3 = service.dispatch_alert(req_forced, self.db)
        self.assertEqual(resp3.status, "DELIVERED")
        self.assertTrue(resp3.confirmed_by_provider)

    def test_api_alert_test_endpoint_safe_mode(self):
        payload = {
            "channel": "webhook",
            "water_body_name": "Cascade Canyon River",
            "recipient": "https://dispatch.local/webhook",
            "safe_simulation_only": True
        }
        res = self.client.post("/api/v1/alerts/test", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["status"], "TEST_MODE_SIMULATED")
        self.assertFalse(data["confirmed_by_provider"])
        self.assertTrue(data["test_mode"])
        self.assertIn("Safe Test Mode", data["provider_message"])

        # Verify audit log in database recorded the test advisory text
        from app.models.alert_delivery import AlertDeliveryModel
        record = self.db.query(AlertDeliveryModel).filter_by(id=data["delivery_id"]).first()
        self.assertIsNotNone(record)
        self.assertIn("TEST ADVISORY", record.message)

    def test_api_alert_test_endpoint_unconfigured_rejection(self):
        payload = {
            "channel": "webhook",
            "water_body_name": "Cascade Canyon River",
            "recipient": "",
            "safe_simulation_only": False
        }
        res = self.client.post("/api/v1/alerts/test", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["status"], "UNCONFIGURED")
        self.assertFalse(data["confirmed_by_provider"])

if __name__ == "__main__":
    unittest.main()
