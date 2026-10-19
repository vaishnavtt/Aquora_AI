"""
Tests for POST /api/v1/predict endpoint.
"""

def test_predict_standard_payload(client):
    """Verifies standard prediction payload calculation and response structure."""
    payload = {
        "water_body_id": 1,
        "water_temp_c": 13.5,
        "flow_rate_cms": 8.2,
        "depth_meters": 4.1,
        "rainfall_last_24h_mm": 42.0,
        "wind_speed_kmh": 31.5,
        "visibility_meters": 1500.0,
        "include_ai_explanation": False
    }
    response = client.post("/api/v1/predict", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "risk_score" in data
    assert 0.0 <= data["risk_score"] <= 100.0
    assert data["risk_level"] in ["low", "moderate", "high", "extreme"]
    assert 0.0 <= data["confidence"] <= 1.0
    assert isinstance(data["primary_hazards"], list)
    assert isinstance(data["safety_recommendations"], list)
    assert data["model_version"] == "baseline-heuristic-v0.1"
    assert data["is_baseline_model"] is True
    assert data["ai_explanation"] is None

def test_predict_adhoc_without_water_body_id(client):
    """Verifies that water_body_id is strictly optional for ad-hoc point checks."""
    payload = {
        "water_temp_c": 22.0,
        "flow_rate_cms": 0.5,
        "depth_meters": 2.0,
        "rainfall_last_24h_mm": 0.0,
        "wind_speed_kmh": 5.0,
        "visibility_meters": 5000.0
    }
    response = client.post("/api/v1/predict", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["risk_level"] == "low"
    assert data["risk_score"] < 30.0

def test_predict_nonexistent_water_body_id_returns_404(client):
    """Verifies that specifying a non-existent water_body_id returns 404."""
    payload = {
        "water_body_id": 9999,
        "water_temp_c": 18.0,
        "flow_rate_cms": 1.0,
        "depth_meters": 3.0,
        "rainfall_last_24h_mm": 0.0,
        "wind_speed_kmh": 10.0,
        "visibility_meters": 3000.0
    }
    response = client.post("/api/v1/predict", json=payload)
    assert response.status_code == 404
    data = response.json()
    assert "Water body with ID 9999 not found" in data["detail"]

def test_predict_severe_conditions(client):
    """Verifies that severe current, near-freezing temp, and heavy rain trigger extreme risk."""
    payload = {
        "water_temp_c": 4.0,       # Severe Cold Shock (+25)
        "flow_rate_cms": 14.5,     # Violent Current (+35)
        "depth_meters": 5.0,
        "rainfall_last_24h_mm": 60.0, # Flash flood (+20)
        "wind_speed_kmh": 50.0,    # Gale force (+15)
        "visibility_meters": 400.0 # Low visibility (+10)
    }
    response = client.post("/api/v1/predict", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["risk_level"] == "extreme"
    assert data["risk_score"] >= 80.0
    hazard_texts = " ".join(data["primary_hazards"])
    assert "Violent Hydrodynamic Current" in hazard_texts
    assert "Severe Hypothermia" in hazard_texts

def test_predict_validation_water_temp_bounds(client):
    """Verifies water temperature boundary validations (-5.0°C to 45.0°C)."""
    base_payload = {
        "flow_rate_cms": 1.0,
        "depth_meters": 2.0,
        "rainfall_last_24h_mm": 0.0,
        "wind_speed_kmh": 10.0,
        "visibility_meters": 3000.0
    }
    # Below -5.0
    res_low = client.post("/api/v1/predict", json={**base_payload, "water_temp_c": -5.1})
    assert res_low.status_code == 422
    assert "greater_than_equal" in str(res_low.json())

    # Above 45.0
    res_high = client.post("/api/v1/predict", json={**base_payload, "water_temp_c": 45.1})
    assert res_high.status_code == 422
    assert "less_than_equal" in str(res_high.json())

    # Valid boundary values
    res_bound_min = client.post("/api/v1/predict", json={**base_payload, "water_temp_c": -5.0})
    assert res_bound_min.status_code == 200

    res_bound_max = client.post("/api/v1/predict", json={**base_payload, "water_temp_c": 45.0})
    assert res_bound_max.status_code == 200

def test_predict_validation_depth_minimum(client):
    """Verifies depth_meters >= 0.1m constraint."""
    payload = {
        "water_temp_c": 18.0,
        "flow_rate_cms": 1.0,
        "depth_meters": 0.05, # invalid < 0.1
        "rainfall_last_24h_mm": 0.0,
        "wind_speed_kmh": 10.0,
        "visibility_meters": 3000.0
    }
    response = client.post("/api/v1/predict", json=payload)
    assert response.status_code == 422
    assert "greater_than_equal" in str(response.json())

def test_predict_validation_negative_flow_rate(client):
    """Verifies flow_rate_cms >= 0.0 constraint."""
    payload = {
        "water_temp_c": 18.0,
        "flow_rate_cms": -1.0, # invalid < 0
        "depth_meters": 2.0,
        "rainfall_last_24h_mm": 0.0,
        "wind_speed_kmh": 10.0,
        "visibility_meters": 3000.0
    }
    response = client.post("/api/v1/predict", json=payload)
    assert response.status_code == 422

def test_predict_with_ai_explanation_fallback(client):
    """Verifies that include_ai_explanation returns structured advisory text."""
    payload = {
        "water_temp_c": 11.0,
        "flow_rate_cms": 7.0,
        "depth_meters": 3.0,
        "rainfall_last_24h_mm": 20.0,
        "wind_speed_kmh": 15.0,
        "visibility_meters": 2000.0,
        "include_ai_explanation": True
    }
    response = client.post("/api/v1/predict", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["ai_explanation"] is not None
    assert "Aquora Advisory Summary" in data["ai_explanation"] or "AI Advisory" in data["ai_explanation"]
