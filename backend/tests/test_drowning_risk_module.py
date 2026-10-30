"""
AQUORA AI - Comprehensive Test Suite for Drowning-Related Environmental Risk Assessment Module
Covers:
- Environmental hazard inputs
- Missing measurements (System never reports missing data as safe)
- Stale measurements (> 24 hours old)
- All 6 water body types (river, quarry, waterfall, lake, reservoir, canal)
- High rainfall and rapid water-level surges
- Missing barriers & safety infrastructure penalties
- Unknown site vulnerability profiles
- Invalid and out-of-bounds coordinates
- Model unavailable fallback conditions
- Historical assessment trends
"""

import math
from datetime import datetime, timezone, timedelta
import pytest
from fastapi.testclient import TestClient

from app.schemas.drowning_risk import (
    DrowningRiskAssessRequest,
    WhatIfSimulationRequest,
)
from app.services.drowning_risk_service import (
    DrowningRiskService,
    validate_coordinates,
    get_drowning_risk_service,
)


@pytest.fixture
def service() -> DrowningRiskService:
    return get_drowning_risk_service()


def test_environmental_hazard_inputs_calculation(service: DrowningRiskService):
    """Verifies that valid hydrological inputs correctly evaluate Layer A environmental hazard."""
    hazard = service.evaluate_layer_a(
        water_level_m=3.5,
        water_level_delta_1h_m=0.08,
        water_level_delta_3h_m=0.18,
        rainfall_1h_mm=8.0,
        rainfall_24h_mm=25.0,
        discharge_cms=22.0,
        elevation_m=20.0,
        is_monsoon_season=True,
    )
    assert 0.0 <= hazard.hazard_score <= 100.0
    assert hazard.hazard_level in ["low", "moderate", "high", "very_high"]
    assert hazard.water_level_m == 3.5
    assert hazard.water_level_delta_1h_m == 0.08
    assert hazard.forecasted_water_level_change_1h_m is not None
    assert hazard.forecasted_water_level_change_1h_m > 0
    assert len(hazard.top_contributing_factors) > 0


def test_system_never_reports_missing_data_as_safe(service: DrowningRiskService, client: TestClient):
    """
    CRITICAL SAFETY REQUIREMENT:
    When in-situ telemetry measurements (water stage, rainfall, discharge) are completely missing,
    the system must NEVER report the aquatic location as 'LOW' (safe).
    It must enforce a precautionary safety floor (at least MODERATE) and flag high uncertainty.
    """
    req = DrowningRiskAssessRequest(
        water_body_type="river",
        water_level_m=None,
        water_level_delta_1h_m=None,
        water_level_delta_3h_m=None,
        rainfall_1h_mm=None,
        rainfall_24h_mm=None,
        discharge_cms=None,
    )
    res = service.assess_drowning_risk(req=req)

    # Must NOT be LOW risk
    assert res.risk_category in ["MODERATE", "HIGH", "VERY HIGH"], (
        f"Missing data was classified as {res.risk_category}! System must never report missing data as safe."
    )
    assert res.risk_score >= 30.0, "Score fell below 30.0 on completely unmeasured inputs"
    assert res.uncertainty_level == "HIGH"
    assert "never classified as safe" in res.uncertainty_explanation.lower()
    assert any("precautionary" in h.lower() or "missing" in h.lower() for h in res.primary_hazards)
    assert any("precautionary" in r.lower() for r in res.safety_recommendations)

    # Also test via REST API
    api_res = client.post("/api/v1/drowning-risk/assess", json={"water_body_type": "river"})
    assert api_res.status_code == 200
    data = api_res.json()
    assert data["risk_category"] != "LOW"
    assert data["uncertainty_level"] == "HIGH"


def test_stale_measurements_escalate_uncertainty(service: DrowningRiskService, client: TestClient):
    """
    Verifies that sensor observations older than 24 hours are flagged as STALE_TELEMETRY,
    receive an uncertainty penalty buffer, and trigger an elevated uncertainty rating.
    """
    stale_time = (datetime.now(timezone.utc) - timedelta(hours=36)).isoformat()
    req = DrowningRiskAssessRequest(
        water_body_type="river",
        water_level_m=2.5,
        water_level_delta_1h_m=0.01,
        rainfall_24h_mm=5.0,
        discharge_cms=10.0,
        observation_timestamp=stale_time,
    )
    res = service.assess_drowning_risk(req=req)

    assert res.data_freshness_status == "STALE_TELEMETRY"
    assert res.uncertainty_level in ["ELEVATED", "HIGH"]
    assert any("stale" in h.lower() for h in res.primary_hazards)
    assert any("stale" in r.lower() for r in res.safety_recommendations)


def test_different_water_body_types(service: DrowningRiskService):
    """
    Verifies distinct contextual vulnerability profiles across all required water body types:
    river, quarry, waterfall, lake, reservoir, and canal.
    """
    types_to_test = ["quarry", "waterfall", "river", "reservoir", "canal", "lake"]
    scores = {}

    for wb_type in types_to_test:
        layer_b = service.evaluate_layer_b(water_body_type=wb_type)
        assert layer_b.water_body_type == wb_type
        assert len(layer_b.bathymetry_hazard_notes) > 15
        assert len(layer_b.site_vulnerability_profile) > 15
        assert len(layer_b.historical_mortality_context) > 20
        scores[wb_type] = layer_b.vulnerability_score

    # Quarries and waterfalls are documented lethal hazards with severe drop-offs and plunge pools
    assert scores["quarry"] >= 75.0, "Quarry vulnerability must reflect vertical rock drops and cold shock"
    assert scores["waterfall"] >= 70.0, "Waterfall vulnerability must reflect aerated plunge boil"
    # Calm fresh lakes/ponds have lower base bathymetric hazard than quarries
    assert scores["lake"] < scores["quarry"]
    assert scores["lake"] < scores["waterfall"]


def test_high_rainfall_and_rapid_water_level_changes(service: DrowningRiskService):
    """
    Verifies that severe rainfall (>100mm/24h) and rapid stage surge (>0.3m/1h)
    escalate the drowning-related environmental risk to HIGH or VERY HIGH.
    """
    surge_req = DrowningRiskAssessRequest(
        water_body_type="river",
        water_level_m=6.8,
        water_level_delta_1h_m=0.45,
        water_level_delta_3h_m=1.10,
        rainfall_1h_mm=35.0,
        rainfall_24h_mm=135.0,
        discharge_cms=180.0,
        is_monsoon_season=True,
    )
    res = service.assess_drowning_risk(req=surge_req)

    assert res.risk_category in ["HIGH", "VERY HIGH"]
    assert res.risk_score >= 65.0
    assert res.layer_a_environmental_hazard.forecasted_water_level_change_1h_m is not None
    assert res.layer_a_environmental_hazard.forecasted_water_level_change_1h_m > 0.20
    assert any("surge" in f.lower() or "rapid" in f.lower() for f in res.primary_hazards)
    assert any("water entry ban" in r.lower() or "prohibited" in r.lower() for r in res.safety_recommendations)


def test_missing_barriers_and_safety_infrastructure_penalty(service: DrowningRiskService):
    """
    Verifies that missing barriers, warning signs, and rescue equipment penalize the
    contextual score and trigger infrastructure safety directives.
    """
    protected = service.evaluate_layer_b(
        water_body_type="river",
        has_barriers=True,
        has_warning_signs=True,
        has_rescue_equipment=True,
    )
    unprotected = service.evaluate_layer_b(
        water_body_type="river",
        has_barriers=False,
        has_warning_signs=False,
        has_rescue_equipment=False,
    )

    assert protected.safety_infrastructure_status == "COMPREHENSIVE"
    assert unprotected.safety_infrastructure_status == "UNPROTECTED"
    assert unprotected.vulnerability_score > protected.vulnerability_score

    # Full assessment checks directives
    res = service.assess_drowning_risk(
        req=DrowningRiskAssessRequest(
            water_body_type="river",
            water_level_m=2.0,
            has_barriers=False,
            has_warning_signs=False,
            has_rescue_equipment=False,
        )
    )
    assert any("fencing" in r.lower() or "barrier" in r.lower() for r in res.safety_recommendations)
    assert any("signage" in r.lower() or "warning" in r.lower() for r in res.safety_recommendations)
    assert any("rescue" in r.lower() or "lifebuoy" in r.lower() for r in res.safety_recommendations)


def test_unknown_site_vulnerability_profile(service: DrowningRiskService):
    """
    Verifies that submitting an unclassified water body does not crash,
    and applies a precautionary profile flagged with UNKNOWN_SITE_PROFILE.
    """
    layer_b = service.evaluate_layer_b(water_body_type="unregistered_drainage_culvert_trench")
    assert layer_b.site_vulnerability_status == "UNKNOWN_SITE_PROFILE"
    assert layer_b.vulnerability_score >= 45.0  # Precautionary margin
    assert "Unclassified" in layer_b.water_body_type_label

    # Assess overall
    res = service.assess_drowning_risk(
        req=DrowningRiskAssessRequest(water_body_type="unregistered_drainage_culvert_trench")
    )
    assert res.layer_b_contextual_risk.site_vulnerability_status == "UNKNOWN_SITE_PROFILE"


def test_invalid_and_out_of_bounds_coordinates(service: DrowningRiskService):
    """
    Verifies that non-terrestrial or out-of-Kerala coordinates are detected,
    flagged as OUT_OF_BOUNDS_COORDINATES, and marked with elevated uncertainty.
    """
    # Coordinates in Delhi, India (outside Kerala)
    is_valid, status = validate_coordinates(28.6139, 77.2090)
    assert is_valid is False
    assert status == "OUT_OF_BOUNDS_COORDINATES"

    # Coordinates in North Atlantic Ocean
    is_valid_ocean, status_ocean = validate_coordinates(52.0, -25.0)
    assert is_valid_ocean is False
    assert status_ocean == "OUT_OF_BOUNDS_COORDINATES"

    # Invalid NaN / Inf coordinates
    is_valid_nan, status_nan = validate_coordinates(float("nan"), 76.5)
    assert is_valid_nan is False
    assert status_nan == "INVALID_NUMERIC_COORDINATES"

    # Evaluate via service
    res = service.assess_drowning_risk(
        req=DrowningRiskAssessRequest(
            water_body_type="river",
            latitude=28.6139,
            longitude=77.2090,
            water_level_m=2.0,
        )
    )
    assert res.coordinate_validity == "OUT_OF_BOUNDS_COORDINATES"
    assert res.uncertainty_level in ["ELEVATED", "HIGH"]
    assert any("out-of-bounds" in h.lower() for h in res.primary_hazards)


def test_model_unavailable_conditions(service: DrowningRiskService, monkeypatch):
    """
    Verifies that if the ML classifier artifact is missing or fails to load,
    the service cleanly falls back to the kinematic heuristic without throwing an exception.
    """
    # Temporarily remove model
    monkeypatch.setattr(service, "_ml_model", None)

    hazard = service.evaluate_layer_a(
        water_level_m=4.5,
        water_level_delta_1h_m=0.15,
        rainfall_24h_mm=40.0,
    )
    assert hazard.is_model_calibrated is False
    assert "Kinematic" in hazard.ml_model_name
    assert hazard.ml_hazard_probability is None
    assert 0.0 <= hazard.hazard_score <= 100.0


def test_historical_assessment_trends(service: DrowningRiskService):
    """
    Verifies that the response provides a 24-hour historical trend sequence
    of assessed risk points for operational timeline visualization.
    """
    res = service.assess_drowning_risk(
        req=DrowningRiskAssessRequest(water_body_type="river", water_level_m=3.0)
    )
    assert res.historical_trend is not None
    assert len(res.historical_trend) >= 8

    # Check structure of trend records
    first_record = res.historical_trend[0]
    assert "timestamp" in first_record
    assert "risk_score" in first_record
    assert "risk_category" in first_record
    assert 0.0 <= first_record["risk_score"] <= 100.0

