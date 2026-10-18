"""
Tests for GET /api/v1/health endpoint.
"""

from unittest.mock import MagicMock
from backend.app.db.session import get_db
from backend.app.main import app

def test_health_check_healthy(client):
    """Verifies that GET /api/v1/health returns 200 with healthy status when DB is connected."""
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["database"] == "connected"
    assert data["version"] == "1.0.0"
    assert data["ml_model_loaded"] is False
    assert "timestamp" in data

def test_health_check_database_degraded(client):
    """Verifies that GET /api/v1/health reports degraded status if database query fails."""
    mock_db = MagicMock()
    mock_db.query.side_effect = Exception("Simulated SQLite disconnection")

    def override_broken_db():
        yield mock_db

    app.dependency_overrides[get_db] = override_broken_db
    try:
        response = client.get("/api/v1/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "degraded"
        assert "error: Simulated SQLite disconnection" in data["database"]
    finally:
        app.dependency_overrides.pop(get_db, None)

def test_root_endpoint(client):
    """Verifies the root informational endpoint."""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["service"] == "AQUORA AI"
    assert data["version"] == "1.0.0"
    assert data["api_v1"] == "/api/v1"
