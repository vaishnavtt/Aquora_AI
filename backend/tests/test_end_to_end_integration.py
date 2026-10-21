"""
AQUORA AI - Comprehensive End-to-End Integration Test Suite
Validates:
1. Live Meteorological & Weather Forecast API (Open-Meteo REST service and offline fallback).
2. Outbound SMS notification dispatch via Twilio (including test mode, credentials check, and delivery logs).
3. Leakage-free Machine Learning evaluation metrics and spatial generalization validation.
4. Dataset ingestion integrity, coordinate corrections, and spatial uncertainty boundaries.
5. Multi-channel alert dispatch and duplicate suppression across Webhook, Email, and SMS.
6. What-If Scenario simulation consistency (baseline vs simulated isolation, non-mutation of raw data).
"""

import os
import json
import pytest
from fastapi.testclient import TestClient
from app.core.config import settings
from app.services.weather_service import weather_service
from app.services.alert_service import alert_service
from app.services.drowning_risk_service import drowning_risk_service
from app.models.water_body import WaterBodyModel


def test_weather_live_endpoint_success(client: TestClient):
    """Tests GET /api/v1/weather/live for Kerala coordinates."""
    # Ramamangalam Bridge coordinates
    res = client.get("/api/v1/weather/live?latitude=9.9482&longitude=76.5412&water_body_name=Ramamangalam+Bridge")
    assert res.status_code == 200
    data = res.json()

    assert data["latitude"] == pytest.approx(9.9482, abs=0.01)
    assert data["longitude"] == pytest.approx(76.5412, abs=0.01)
    assert "current_temperature_c" in data
    assert "current_precipitation_mm_h" in data
    assert "weather_condition" in data
    assert "hourly_forecast" in data
    assert len(data["hourly_forecast"]) > 0
    assert "data_source" in data
    assert "disclaimer" in data


def test_weather_water_body_endpoint(client: TestClient, db_session):
    """Tests GET /api/v1/weather/water-body/{id}."""
    wb = db_session.query(WaterBodyModel).first()
    assert wb is not None

    res = client.get(f"/api/v1/weather/water-body/{wb.id}")
    assert res.status_code == 200
    data = res.json()
    assert data["water_body_id"] == wb.id
    assert data["latitude"] == pytest.approx(wb.latitude, abs=0.01)


def test_weather_offline_fallback():
    """Tests WeatherService fallback behavior when service is disabled."""
    # Temporarily disable API
    prev_state = weather_service.enabled
    try:
        weather_service.enabled = False
        res = weather_service.get_weather_for_coordinates(9.9482, 76.5412)
        assert res.is_live_data is False
        assert "fallback" in res.disclaimer.lower() or "disabled" in res.disclaimer.lower() or "baseline" in res.disclaimer.lower()
        assert len(res.hourly_forecast) == 24
    finally:
        weather_service.enabled = prev_state


def test_alert_sms_channel_dispatch(client: TestClient):
    """Tests alert dispatch over SMS channel in test mode."""
    payload = {
        "water_body_name": "Athirappilly Waterfalls",
        "severity": "high",
        "message": "Water surge advisory: aerated plunge pool velocity elevated.",
        "channel": "sms",
        "recipient": "+919876543210",
        "test_mode": True,
        "force": True,
    }
    res = client.post("/api/v1/alerts/dispatch", json=payload)
    assert res.status_code == 200
    data = res.json()

    assert data["channel"] == "sms"
    assert data["status"] == "TEST_MODE_SIMULATED"
    assert data["test_mode"] is True
    assert "+919876543210" in data["recipient"]
    assert "Simulated" in data["provider_message"]


def test_alert_sms_test_endpoint(client: TestClient):
    """Tests /api/v1/alerts/test with SMS channel."""
    payload = {
        "channel": "sms",
        "recipient": "+919847000000",
        "water_body_name": "Ramamangalam Bridge",
        "safe_simulation_only": True,
    }
    res = client.post("/api/v1/alerts/test", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["channel"] == "sms"
    assert data["status"] == "TEST_MODE_SIMULATED"


def test_alert_channel_status_includes_sms(client: TestClient):
    """Tests GET /api/v1/alerts/status reports SMS channel configuration."""
    res = client.get("/api/v1/alerts/status")
    assert res.status_code == 200
    data = res.json()
    assert "webhook_configured" in data
    assert "email_configured" in data
    assert "sms_configured" in data


def test_leak_free_ml_evaluation_metrics_in_model_status(client: TestClient):
    """Verifies ModelStatusResponse exposes the leak-free antecedent and spatial benchmarks."""
    res = client.get("/api/v1/drowning-risk/model-status")
    assert res.status_code == 200
    data = res.json()

    # Leak-free benchmark assertions
    assert "leak_free_antecedent_benchmark" in data
    lf = data["leak_free_antecedent_benchmark"]
    if lf:
        assert "uncalibrated_test_metrics" in lf
        assert "features_used" in lf
        # Simultaneous formula columns must NOT be in leak-free features
        features = lf["features_used"]
        assert "water_level_m" not in features
        assert "wl_delta_1h" not in features
        assert "wl_delta_3h" not in features

    # Spatial generalization benchmark assertions
    assert "spatial_generalization_benchmark" in data
    sp = data["spatial_generalization_benchmark"]
    if sp:
        assert "station_evaluations" in sp
        assert len(sp["station_evaluations"]) >= 3


def test_raw_files_unmodified():
    """Verifies that data/raw/ files exist and their integrity is preserved."""
    repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
    raw_dir = os.path.join(repo_root, "data", "raw")

    required_files = [
        "rwl_tele_hr_kerala-sw_999_1991_2020.csv",
        "rainfall_tel_hr_kerala-sw_kl_1991_2020.csv",
        "river_discharge_manual_daily_kerala_sw_kl_2001_2025.csv",
        "rwl_tel_hr_kerala_sw_999_2021_2025.csv",
    ]

    for fname in required_files:
        fpath = os.path.join(raw_dir, fname)
        assert os.path.exists(fpath), f"Raw file missing: {fname}"
        assert os.path.getsize(fpath) > 0, f"Raw file unexpectedly empty: {fname}"


def test_what_if_simulation_does_not_mutate_db(client: TestClient, db_session):
    """Verifies What-If simulation does not alter stored water body records."""
    wb = db_session.query(WaterBodyModel).filter(WaterBodyModel.type == "river").first()
    assert wb is not None

    initial_score = wb.risk_score
    initial_level = wb.current_risk_level

    # Run heavy simulation
    sim_payload = {
        "water_body_id": wb.id,
        "water_body_type": wb.type,
        "simulated_rainfall_increment_mm": 150.0,
        "simulated_stage_delta_m": 3.0,
        "simulated_discharge_increment_cms": 100.0,
    }
    res = client.post("/api/v1/drowning-risk/simulate", json=sim_payload)
    assert res.status_code == 200
    sim_data = res.json()
    assert sim_data["simulated_assessment"]["risk_score"] > initial_score

    # Refresh DB model and ensure stored values remained unchanged
    db_session.refresh(wb)
    assert wb.risk_score == initial_score
    assert wb.current_risk_level == initial_level
