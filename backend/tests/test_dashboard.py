"""
Tests for GET /api/v1/dashboard endpoint.
"""

def test_dashboard_metrics(client):
    """Verifies that GET /api/v1/dashboard aggregates correct counts and formatted alerts."""
    response = client.get("/api/v1/dashboard")
    assert response.status_code == 200
    data = response.json()

    # Total monitored demonstration sites: 6
    assert data["total_monitored_sites"] == 6
    # 1 high risk site (Cascade Canyon River)
    assert data["high_risk_sites_count"] == 1
    # 4 safe sites (low risk)
    assert data["safe_sites_count"] == 4
    # 1 moderate site (Marina Outer Point)
    assert data["moderate_risk_sites_count"] == 1

    assert data["system_status"] == "operational"
    assert "last_sync" in data

    # Verify recent alerts
    assert isinstance(data["recent_alerts"], list)
    assert len(data["recent_alerts"]) >= 1
    first_alert = data["recent_alerts"][0]
    assert first_alert["severity"] == "high"
    assert "Cascade" in first_alert["water_body_name"]
    assert "DEMONSTRATION ALERT" in first_alert["message"]
