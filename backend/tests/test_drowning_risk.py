"""
Unit and integration test suite for AQUORA AI Drowning-Risk Prediction System.
Tests:
- All 5 REST endpoints under /api/v1/drowning-risk/
- Two-layer risk calculation (Layer A: Environmental Hazard + Layer B: Contextual Risk)
- What-If simulation delta calculation
- Model status, 5-dataset audit, empty file exclusion validation
- Edge case handling, validation, and scientific disclaimer assertions
"""

import os
import json
import pytest
from fastapi.testclient import TestClient
from app.db.init_db import get_kerala_water_bodies
from app.models.water_body import WaterBodyModel


@pytest.fixture(autouse=True)
def seed_kerala_sites(db_session):
    """Ensures Kerala sites spanning quarries, waterfalls, canals are present for drowning risk tests."""
    sites = get_kerala_water_bodies()
    for s in sites:
        existing = db_session.query(WaterBodyModel).filter(WaterBodyModel.name == s.name).first()
        if not existing:
            db_session.add(s)
    db_session.commit()


def test_get_drowning_risk_water_bodies(client: TestClient):
    """Verifies that the water bodies endpoint returns all monitored Kerala aquatic locations."""
    response = client.get("/api/v1/drowning-risk/water-bodies")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 6

    # Verify presence of multiple aquatic environment types in Layer B
    types = {wb["layer_b_contextual_risk"]["water_body_type"] for wb in data}
    assert "river" in types
    assert "quarry" in types
    assert "waterfall" in types
    assert "lake" in types or "pond" in types
    assert "reservoir" in types
    assert "canal" in types


def test_get_drowning_risk_for_water_body(client: TestClient):
    """Verifies detailed two-layer risk assessment for a specific water body."""
    # First get list of water bodies
    response = client.get("/api/v1/drowning-risk/water-bodies")
    assert response.status_code == 200
    assessments = response.json()
    assert len(assessments) > 0
    first_wb = assessments[0]
    wb_id = first_wb["water_body_id"]

    res = client.get(f"/api/v1/drowning-risk/water-body/{wb_id}")
    assert res.status_code == 200
    assessment = res.json()

    # Verify top-level assessment fields
    assert assessment["water_body_id"] == wb_id
    assert assessment["risk_category"] in ["LOW", "MODERATE", "HIGH", "VERY HIGH"]
    assert 0.0 <= assessment["risk_score"] <= 100.0
    assert "TWO_LAYER" in assessment["assessment_method"]
    assert len(assessment["primary_hazards"]) > 0
    assert len(assessment["safety_recommendations"]) > 0
    assert len(assessment["scientific_disclaimer"]) > 50

    # Verify Layer A (Environmental Hazard)
    layer_a = assessment["layer_a_environmental_hazard"]
    assert 0.0 <= layer_a["hazard_score"] <= 100.0
    assert layer_a["hazard_level"] in ["low", "moderate", "high", "very_high"]
    assert layer_a["ml_model_name"] is not None

    # Verify Layer B (Contextual Drowning Risk)
    layer_b = assessment["layer_b_contextual_risk"]
    assert 0.0 <= layer_b["vulnerability_score"] <= 100.0
    assert layer_b["exposure_risk_level"] in ["low", "moderate", "high", "extreme"]
    assert len(layer_b["historical_mortality_context"]) > 20


def test_quarry_and_waterfall_vulnerability(client: TestClient):
    """
    Verifies that abandoned quarries and waterfalls carry high Layer B contextual risk
    due to steep drop-offs, plunge pools, and thermocline cold shock, even when flow is zero.
    """
    res = client.get("/api/v1/drowning-risk/water-bodies")
    assessments = res.json()
    quarry = next((wb for wb in assessments if wb["layer_b_contextual_risk"]["water_body_type"] == "quarry"), None)
    waterfall = next((wb for wb in assessments if wb["layer_b_contextual_risk"]["water_body_type"] == "waterfall"), None)

    if quarry:
        q_res = client.get(f"/api/v1/drowning-risk/water-body/{quarry['water_body_id']}")
        assert q_res.status_code == 200
        q_data = q_res.json()
        assert q_data["layer_b_contextual_risk"]["vulnerability_score"] >= 75.0
        assert "quarry" in q_data["layer_b_contextual_risk"]["water_body_type"].lower()
        assert any("quarry" in h.lower() or "drop" in h.lower() or "cold" in h.lower() or "steep" in h.lower() for h in q_data["primary_hazards"])

    if waterfall:
        w_res = client.get(f"/api/v1/drowning-risk/water-body/{waterfall['water_body_id']}")
        assert w_res.status_code == 200
        w_data = w_res.json()
        assert w_data["layer_b_contextual_risk"]["vulnerability_score"] >= 70.0
        assert any("plunge" in h.lower() or "flash" in h.lower() or "aerat" in h.lower() or "rock" in h.lower() for h in w_data["primary_hazards"])


def test_post_assess_drowning_risk_scenarios(client: TestClient):
    """Tests POST /api/v1/drowning-risk/assess under mild vs extreme conditions."""
    # Scenario 1: Mild conditions
    mild_payload = {
        "water_body_type": "river",
        "water_level_m": 2.5,
        "water_level_delta_1h_m": 0.02,
        "water_level_delta_3h_m": 0.05,
        "rainfall_1h_mm": 2.0,
        "rainfall_3h_mm": 5.0,
        "rainfall_24h_mm": 12.0,
        "discharge_cms": 15.0,
        "water_temp_c": 26.0,
        "elevation_m": 25.0
    }
    mild_res = client.post("/api/v1/drowning-risk/assess", json=mild_payload)
    assert mild_res.status_code == 200
    mild_data = mild_res.json()
    assert mild_data["risk_category"] in ["LOW", "MODERATE"]

    # Scenario 2: Severe monsoon surge conditions
    surge_payload = {
        "water_body_type": "river",
        "water_level_m": 9.5,
        "water_level_delta_1h_m": 0.85,
        "water_level_delta_3h_m": 2.10,
        "rainfall_1h_mm": 45.0,
        "rainfall_3h_mm": 95.0,
        "rainfall_24h_mm": 180.0,
        "discharge_cms": 320.0,
        "water_temp_c": 21.0,
        "elevation_m": 25.0
    }
    surge_res = client.post("/api/v1/drowning-risk/assess", json=surge_payload)
    assert surge_res.status_code == 200
    surge_data = surge_res.json()
    assert surge_data["risk_category"] in ["HIGH", "VERY HIGH"]
    assert surge_data["risk_score"] > mild_data["risk_score"]
    assert surge_data["layer_a_environmental_hazard"]["hazard_score"] > mild_data["layer_a_environmental_hazard"]["hazard_score"]


def test_what_if_simulation_endpoint(client: TestClient):
    """Tests POST /api/v1/drowning-risk/simulate for scenario modeling."""
    sim_payload = {
        "water_body_type": "river",
        "simulated_rainfall_increment_mm": 75.0,
        "simulated_stage_delta_m": 1.5,
        "simulated_discharge_increment_cms": 80.0,
        "simulated_water_temp_c": 22.0
    }
    res = client.post("/api/v1/drowning-risk/simulate", json=sim_payload)
    assert res.status_code == 200
    data = res.json()

    assert data["baseline_assessment"] is not None
    assert data["simulated_assessment"] is not None
    assert data["delta_risk_score"] > 0
    assert data["simulated_assessment"]["risk_score"] > data["baseline_assessment"]["risk_score"]
    assert "hypothetical" in data["simulation_notes"].lower()


def test_model_status_and_dataset_audit(client: TestClient):
    """
    Tests GET /api/v1/drowning-risk/model-status.
    Ensures that all 5 target files are explicitly audited and tracked.
    """
    res = client.get("/api/v1/drowning-risk/model-status")
    assert res.status_code == 200
    data = res.json()

    assert data["champion_model_name"] is not None
    assert "all_models_benchmarks" in data
    assert len(data["all_models_benchmarks"]) >= 4

    # Champion model check
    assert "HistGradientBoosting" in data["champion_model_name"]
    assert data["metrics_summary"]["pr_auc"] > 0.80
    assert data["metrics_summary"]["f1_score"] > 0.65

    # Raw datasets audit check
    audit = data["datasets_audit"]
    assert isinstance(audit, list)
    assert len(audit) >= 5

    # Check the 5 required files explicitly
    filenames = [item["filename"] for item in audit]

    assert any("rwl_tele_hr_kerala-sw_999_1991_2020.csv" in f for f in filenames)
    assert any("rainfall_tel_hr_kerala-sw_kl_1991_2020.csv" in f for f in filenames)
    assert any("river_discharge_manual_daily_kerala_sw_kl_2001_2025.csv" in f for f in filenames)
    assert any("rwl_tel_hr_kerala_sw_999_2026_2030" in f for f in filenames)
    assert any("rainfall_tel_hr_kerala_sw_kl_2021_2025" in f for f in filenames)

    # Empty file check: must be marked EXCLUDED_EMPTY or similar and have 0 records
    empty_file = next((item for item in audit if "2026_2030" in item["filename"]), None)
    assert empty_file is not None
    assert empty_file["row_count"] == 0
    assert empty_file["usable_for_training"] is False
    assert "empty" in empty_file["rejection_reason"].lower() or "header" in empty_file["rejection_reason"].lower()


def test_nonexistent_water_body_404(client: TestClient):
    """Verifies that requesting an invalid water body returns HTTP 404."""
    res = client.get("/api/v1/drowning-risk/water-body/999999")
    assert res.status_code == 404
    assert "not found" in res.json()["detail"].lower()


def test_edge_case_zero_and_missing_inputs(client: TestClient):
    """Verifies that missing or minimal input fields default safely without server errors."""
    minimal_payload = {
        "water_body_type": "lake",
        "water_level_m": 3.0
    }
    res = client.post("/api/v1/drowning-risk/assess", json=minimal_payload)
    assert res.status_code == 200
    data = res.json()
    assert data["risk_score"] >= 0.0
    assert len(data["missing_variables"]) > 0
