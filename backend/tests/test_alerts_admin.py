"""
AQUORA AI - Telemetry Providers, Alert Resilience & Admin Diagnostics Test Suite
Tests:
- Authentic telemetry providers status endpoint
- Outbound alert channel validation & non-intrusive probe
- System administration diagnostics (runtime, SQLite metrics, ML status)
- User personnel directory & status updating
- Live operational log viewer
"""

import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.db.session import SessionLocal
from app.models.user import UserModel


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c


def test_telemetry_providers_status(client):
    res = client.get("/api/v1/telemetry/providers/status")
    assert res.status_code == 200
    data = res.json()
    assert "providers" in data
    assert len(data["providers"]) >= 3

    provider_ids = [p["id"] for p in data["providers"]]
    assert "usgs" in provider_ids
    assert "nwic" in provider_ids
    assert "open_meteo" in provider_ids

    nwic = next(p for p in data["providers"] if p["id"] == "nwic")
    assert nwic["requires_auth"] is True
    assert nwic["historical_fallback_status"] == "ACTIVE_KERALA_SW_ARCHIVE"


def test_alert_channels_validation(client):
    res = client.post("/api/v1/alerts/validate-channels")
    assert res.status_code == 200
    data = res.json()
    assert "channels" in data
    assert "webhook" in data["channels"]
    assert "email" in data["channels"]
    assert "sms" in data["channels"]


def test_admin_diagnostics(client):
    res = client.get("/api/v1/admin/diagnostics")
    assert res.status_code == 200
    data = res.json()
    assert data["system_status"] == "OPERATIONAL"
    assert "runtime" in data
    assert "database" in data
    assert data["database"]["type"] == "SQLite3"
    assert "table_record_counts" in data["database"]
    assert data["database"]["table_record_counts"]["water_bodies"] > 0
    assert "machine_learning" in data
    assert "background_monitoring" in data


def test_admin_users_list_and_filter(client):
    res = client.get("/api/v1/admin/users")
    assert res.status_code == 200
    users = res.json()
    assert len(users) >= 4

    # Filter by role
    res_admin = client.get("/api/v1/admin/users?role=ADMIN")
    assert res_admin.status_code == 200
    admins = res_admin.json()
    assert all(u["role"] == "ADMIN" for u in admins)
    assert any(u["username"] == "admin" for u in admins)


def test_admin_user_status_update(client):
    # Lookup viewer user
    db = SessionLocal()
    viewer = db.query(UserModel).filter(UserModel.username == "viewer").first()
    db.close()
    assert viewer is not None

    # Toggle active status
    res = client.patch(
        f"/api/v1/admin/users/{viewer.id}",
        json={"is_active": False},
    )
    assert res.status_code == 200
    assert res.json()["is_active"] is False

    # Restore active status
    res_restore = client.patch(
        f"/api/v1/admin/users/{viewer.id}",
        json={"is_active": True},
    )
    assert res_restore.status_code == 200
    assert res_restore.json()["is_active"] is True


def test_admin_operational_logs(client):
    res = client.get("/api/v1/admin/logs?limit=20")
    assert res.status_code == 200
    data = res.json()
    assert "logs" in data
    assert len(data["logs"]) >= 1
    log_item = data["logs"][0]
    assert "timestamp" in log_item
    assert "level" in log_item
    assert "message" in log_item

