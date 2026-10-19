"""
Tests for GET /api/v1/water-bodies and GET /api/v1/water-bodies/{id} endpoints.
"""

def test_get_all_water_bodies(client):
    """Verifies that GET /api/v1/water-bodies returns all 6 monitored stations."""
    response = client.get("/api/v1/water-bodies")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) == 6

    # Verify attributes and demonstration flags on records
    first = data[0]
    required_keys = {
        "id", "name", "type", "latitude", "longitude",
        "current_risk_level", "risk_score", "water_temp_c",
        "flow_rate_cms", "depth_meters", "last_updated",
        "description", "is_demonstration_data"
    }
    assert required_keys.issubset(first.keys())
    assert first["is_demonstration_data"] is True
    assert "DEMONSTRATION" in first["name"] or "DEMONSTRATION" in first["description"]

def test_filter_water_bodies_by_risk_level(client):
    """Verifies query parameter filtering by risk_level."""
    # Filter high risk: only Cascade Canyon River
    response_high = client.get("/api/v1/water-bodies?risk_level=high")
    assert response_high.status_code == 200
    high_sites = response_high.json()
    assert len(high_sites) == 1
    assert high_sites[0]["current_risk_level"] == "high"
    assert "Cascade" in high_sites[0]["name"]

    # Filter low risk: 4 sites
    response_low = client.get("/api/v1/water-bodies?risk_level=low")
    assert response_low.status_code == 200
    low_sites = response_low.json()
    assert len(low_sites) == 4
    for site in low_sites:
        assert site["current_risk_level"] == "low"

def test_filter_water_bodies_by_type(client):
    """Verifies query parameter filtering by water body type."""
    response_river = client.get("/api/v1/water-bodies?type=river")
    assert response_river.status_code == 200
    river_sites = response_river.json()
    assert len(river_sites) == 2
    for site in river_sites:
        assert site["type"] == "river"

    response_coastal = client.get("/api/v1/water-bodies?type=coastal")
    assert response_coastal.status_code == 200
    coastal_sites = response_coastal.json()
    assert len(coastal_sites) == 1
    assert coastal_sites[0]["type"] == "coastal"

def test_filter_water_bodies_combined(client):
    """Verifies combined risk_level and type query filtering."""
    response = client.get("/api/v1/water-bodies?risk_level=high&type=river")
    assert response.status_code == 200
    sites = response.json()
    assert len(sites) == 1
    assert sites[0]["type"] == "river"
    assert sites[0]["current_risk_level"] == "high"

def test_invalid_risk_level_triggers_422(client):
    """Verifies that an unsupported risk_level query value triggers a 422 validation error."""
    response = client.get("/api/v1/water-bodies?risk_level=catastrophic")
    assert response.status_code == 422
    data = response.json()
    assert "detail" in data
    # Verify standard validation error structure
    error = data["detail"][0]
    assert error["loc"] == ["query", "risk_level"]

def test_invalid_type_triggers_422(client):
    """Verifies that an unsupported water body type query value triggers a 422 validation error."""
    response = client.get("/api/v1/water-bodies?type=ocean_trench")
    assert response.status_code == 422
    data = response.json()
    assert "detail" in data
    error = data["detail"][0]
    assert error["loc"] == ["query", "type"]

def test_get_water_body_by_id_success(client):
    """Verifies GET /api/v1/water-bodies/{id} returns the specific site."""
    response = client.get("/api/v1/water-bodies/1")
    assert response.status_code == 200
    site = response.json()
    assert site["id"] == 1
    assert "Emerald" in site["name"]
    assert site["type"] == "reservoir"

def test_get_water_body_by_id_not_found(client):
    """Verifies GET /api/v1/water-bodies/{id} returns 404 if site does not exist."""
    response = client.get("/api/v1/water-bodies/9999")
    assert response.status_code == 404
    data = response.json()
    assert "Water body with ID 9999 not found" in data["detail"]
