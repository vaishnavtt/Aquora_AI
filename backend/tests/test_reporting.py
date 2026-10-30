"""
AQUORA AI - Reporting & Analytics Test Suite
Tests:
- HTML Printable Hazard Assessment Dossier generation
- JSON Structured Hazard Assessment Report format
- District-wise risk aggregation across 14 Kerala districts
- ML model benchmark diagnostics reporting
"""

import pytest
from fastapi.testclient import TestClient
from app.main import app


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c


def test_get_hazard_assessment_report_html(client):
    res = client.get("/api/v1/reports/hazard-assessment/1")
    assert res.status_code == 200
    assert "text/html" in res.headers["content-type"]
    html = res.text
    assert "<!DOCTYPE html>" in html
    assert "AQUORA AI" in html
    assert "Disaster Management & Water Safety Decision Support System" in html
    assert "Layer A: Environmental Aquatic Hazard" in html
    assert "Layer B: Contextual Site Vulnerability" in html
    assert "Field Safety Auditor" in html


def test_get_hazard_assessment_report_json(client):
    res = client.get("/api/v1/reports/hazard-assessment/1/json")
    assert res.status_code == 200
    data = res.json()
    assert "report_id" in data
    assert data["report_id"].startswith("AQ-HAZ-0001-")
    assert "station" in data
    assert "risk_evaluation" in data
    assert "layer_a_environmental_hazard" in data["risk_evaluation"]
    assert "layer_b_contextual_risk" in data["risk_evaluation"]
    assert "disclaimer" in data


def test_get_hazard_assessment_nonexistent_station(client):
    res = client.get("/api/v1/reports/hazard-assessment/999999")
    assert res.status_code == 404
    assert "not found" in res.json()["detail"].lower()


def test_get_district_summary(client):
    res = client.get("/api/v1/reports/district-summary")
    assert res.status_code == 200
    data = res.json()
    assert data["state"] == "Kerala"
    assert data["total_districts"] == 14
    assert len(data["districts"]) == 14

    district_names = [d["district"] for d in data["districts"]]
    assert "Ernakulam" in district_names
    assert "Idukki" in district_names
    assert "Wayanad" in district_names
    assert "Alappuzha" in district_names


def test_get_model_benchmarks(client):
    res = client.get("/api/v1/reports/model-benchmarks")
    assert res.status_code == 200
    data = res.json()
    assert "forecasting_pipeline" in data
    assert "hazard_classification_pipeline" in data
    
    forecasting = data["forecasting_pipeline"]
    assert forecasting["model_type"] == "Ridge Residual Delta Forecaster"
    assert "benchmarks" in forecasting
    assert forecasting["benchmarks"]["mean_absolute_error_meters"] < 0.05
    assert forecasting["benchmarks"]["r_squared_coefficient"] > 0.95

    classification = data["hazard_classification_pipeline"]
    assert "HistGradientBoosting" in classification["model_type"]
    assert classification["benchmarks"]["roc_auc_multiclass"] > 0.90

