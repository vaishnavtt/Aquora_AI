"""
Comprehensive Live Backend & Database Verification Script for AQUORA AI
Performs live HTTP requests to all REST endpoints, verifies data contracts,
database persistence, ML inference, error handling, and scientific constraints.
"""
import sys
import json
import time
import requests
from datetime import datetime, timezone

BASE_URL = "http://127.0.0.1:8000/api/v1"

results = {
    "total_tests": 0,
    "passed": 0,
    "failed": 0,
    "details": []
}

def record(test_name: str, passed: bool, evidence: str = ""):
    results["total_tests"] += 1
    if passed:
        results["passed"] += 1
        status = "PASS"
    else:
        results["failed"] += 1
        status = "FAIL"
    results["details"].append({
        "test": test_name,
        "status": status,
        "evidence": evidence
    })
    print(f"[{status}] {test_name}: {evidence}")

def run_tests():
    print("=== STARTING LIVE API & DATABASE VERIFICATION ===")

    # 1. Health Endpoint
    try:
        r = requests.get(f"{BASE_URL}/health", timeout=5)
        data = r.json()
        passed = (r.status_code == 200 and data.get("status") == "healthy" and data.get("database") == "connected")
        record("GET /health", passed, f"Status: {r.status_code}, health: {data.get('status')}, db: {data.get('database')}")
    except Exception as e:
        record("GET /health", False, str(e))

    # 2. Water Bodies Directory
    try:
        r = requests.get(f"{BASE_URL}/water-bodies", timeout=5)
        data = r.json()
        passed = (r.status_code == 200 and isinstance(data, list) and len(data) > 0)
        record("GET /water-bodies", passed, f"Status: {r.status_code}, returned {len(data)} water bodies")
    except Exception as e:
        record("GET /water-bodies", False, str(e))

    # 3. Waterbody Search
    try:
        r = requests.get(f"{BASE_URL}/waterbodies/search?q=ramamangalam", timeout=5)
        data = r.json()
        items = data.get("results", []) if isinstance(data, dict) else data
        passed = (r.status_code == 200 and len(items) > 0)
        record("GET /waterbodies/search?q=ramamangalam", passed, f"Status: {r.status_code}, matches: {len(items)}")
    except Exception as e:
        record("GET /waterbodies/search", False, str(e))

    # 4. Nearby Rivers (GPS Haversine Discovery)
    try:
        r = requests.get(f"{BASE_URL}/rivers/nearby?latitude=9.9482&longitude=76.5412&radius_km=50", timeout=5)
        data = r.json()
        nearby = data.get("rivers", [])
        passed = (r.status_code == 200 and len(nearby) > 0)
        first_dist = nearby[0].get("distance_km") if nearby else None
        record("GET /rivers/nearby (Haversine discovery)", passed, f"Found {len(nearby)} nearby rivers, nearest dist: {first_dist} km")
    except Exception as e:
        record("GET /rivers/nearby", False, str(e))

    # 5. GIS Waterbody Stats
    try:
        r = requests.get(f"{BASE_URL}/waterbodies/stats", timeout=5)
        data = r.json()
        passed = (r.status_code == 200 and data.get("total_waterbodies", 0) > 0)
        record("GET /waterbodies/stats", passed, f"Total waterbodies: {data.get('total_waterbodies')}")
    except Exception as e:
        record("GET /waterbodies/stats", False, str(e))

    # 6. GIS Viewport Queries
    try:
        r = requests.get(f"{BASE_URL}/waterbodies/viewport?min_lat=9.0&max_lat=10.5&min_lng=76.0&max_lng=77.0", timeout=5)
        data = r.json()
        features = data.get("features", [])
        passed = (r.status_code == 200 and len(features) > 0)
        record("GET /waterbodies/viewport", passed, f"Status: {r.status_code}, returned {len(features)} spatial features")
    except Exception as e:
        record("GET /waterbodies/viewport", False, str(e))

    # 7. Two-Layer Drowning Risk Assessment Directory
    try:
        r = requests.get(f"{BASE_URL}/drowning-risk/water-bodies", timeout=5)
        data = r.json()
        passed = (r.status_code == 200 and isinstance(data, list) and len(data) > 0)
        first_item = data[0] if data else {}
        has_layer_a = "layer_a_environmental_hazard" in first_item
        has_layer_b = "layer_b_contextual_risk" in first_item
        record("GET /drowning-risk/water-bodies (Two-layer architecture)", passed and has_layer_a and has_layer_b,
               f"Returned {len(data)} assessments; Layer A & Layer B verified")
    except Exception as e:
        record("GET /drowning-risk/water-bodies", False, str(e))

    # 8. On-Demand Assessment Calculation (POST /drowning-risk/assess)
    try:
        payload = {
            "water_body_name": "Test Cascade Site",
            "water_body_type": "waterfall",
            "latitude": 10.28,
            "longitude": 76.56,
            "water_level_m": 3.8,
            "flow_rate_cms": 7.5,
            "water_temp_c": 19.5
        }
        r = requests.post(f"{BASE_URL}/drowning-risk/assess", json=payload, timeout=5)
        data = r.json()
        passed = (r.status_code == 200 and "risk_score" in data and not data.get("is_learned_drowning_probability"))
        record("POST /drowning-risk/assess", passed,
               f"Risk score: {data.get('risk_score')}, non-calibrated probability verified: {data.get('is_learned_drowning_probability') is False}")
    except Exception as e:
        record("POST /drowning-risk/assess", False, str(e))

    # 9. What-If Simulation
    try:
        sim_payload = {
            "water_body_id": 1,
            "simulated_rainfall_increment_mm": 50.0,
            "simulated_stage_delta_m": 0.45,
            "simulated_discharge_increment_cms": 4.0,
            "simulated_exposure_scenario": "Monsoon Peak Surge"
        }
        r = requests.post(f"{BASE_URL}/drowning-risk/simulate", json=sim_payload, timeout=5)
        data = r.json()
        passed = (r.status_code == 200 and data.get("is_hypothetical_simulation") is True and "delta_risk_score" in data)
        record("POST /drowning-risk/simulate", passed,
               f"Hypothetical: {data.get('is_hypothetical_simulation')}, Delta risk: {data.get('delta_risk_score')}")
    except Exception as e:
        record("POST /drowning-risk/simulate", False, str(e))

    # 10. ML Model Status & Scientific Benchmarks
    try:
        r = requests.get(f"{BASE_URL}/drowning-risk/model-status", timeout=5)
        data = r.json()
        passed = (r.status_code == 200 and "champion_model_name" in data and "metrics_summary" in data)
        record("GET /drowning-risk/model-status", passed,
               f"Champion: {data.get('champion_model_name')}, OOT Test Accuracy: {data.get('metrics_summary', {}).get('accuracy')}")
    except Exception as e:
        record("GET /drowning-risk/model-status", False, str(e))

    # 11. Historical River Telemetry & Provenance
    try:
        r = requests.get(f"{BASE_URL}/river-data/history/RAMAMANGALAM%20BRIDGE", timeout=5)
        data = r.json()
        series = data.get("readings", [])
        passed = (r.status_code == 200 and len(series) > 0 and data.get("data_source") is not None)
        record("GET /river-data/history/{station_name}", passed,
               f"Returned {len(series)} points, source: {data.get('data_source')}")
    except Exception as e:
        record("GET /river-data/history/{station_name}", False, str(e))

    # 12. Forecast vs Observation Separation
    try:
        r = requests.get(f"{BASE_URL}/river-data/forecast-vs-observation/RAMAMANGALAM%20BRIDGE", timeout=5)
        data = r.json()
        comps = data.get("comparisons", [])
        passed = (r.status_code == 200 and len(comps) > 0 and "model_mae_m" in data)
        record("GET /river-data/forecast-vs-observation/{station}", passed,
               f"Aligned {len(comps)} pairs, Model MAE: {data.get('model_mae_m')}m")
    except Exception as e:
        record("GET /river-data/forecast-vs-observation", False, str(e))

    # 13. Live Ridge Regression Inference (Ramamangalam Bridge)
    try:
        readings = [
            {"timestamp": f"2026-10-30T{i:02d}:00:00Z", "water_level_m": 3.0 + 0.02 * i}
            for i in range(13)
        ]
        ml_payload = {
            "station_name": "RAMAMANGALAM BRIDGE",
            "readings": readings
        }
        r = requests.post(f"{BASE_URL}/forecast/water-level", json=ml_payload, timeout=5)
        data = r.json()
        passed = (r.status_code == 200 and "forecasted_water_level_m" in data and data.get("forecast_horizon") == "1 hour ahead (t+1)")
        record("POST /forecast/water-level (Ridge Regression 1h)", passed,
               f"Current: {data.get('current_water_level_m')}m, Forecast: {data.get('forecasted_water_level_m')}m, Delta: {data.get('predicted_delta_m')}m")
    except Exception as e:
        record("POST /forecast/water-level", False, str(e))

    # 14. Ridge Regression Multi-station: Pala
    try:
        pala_payload = {
            "station_name": "PALA",
            "readings": readings
        }
        r = requests.post(f"{BASE_URL}/forecast/water-level", json=pala_payload, timeout=5)
        data = r.json()
        passed = (r.status_code == 200 and "forecasted_water_level_m" in data)
        record("POST /forecast/water-level (Pala Station)", passed,
               f"Pala forecast: {data.get('forecasted_water_level_m')}m, Trend: {data.get('rate_of_change_trend')}")
    except Exception as e:
        record("POST /forecast/water-level (Pala Station)", False, str(e))

    # 15. Ridge Regression Multi-station: Trinayakudam
    try:
        trinayakudam_payload = {
            "station_name": "TRINAYAKUDAM",
            "readings": readings
        }
        r = requests.post(f"{BASE_URL}/forecast/water-level", json=trinayakudam_payload, timeout=5)
        data = r.json()
        passed = (r.status_code == 200 and "forecasted_water_level_m" in data)
        record("POST /forecast/water-level (Trinayakudam Station)", passed,
               f"Trinayakudam forecast: {data.get('forecasted_water_level_m')}m, Trend: {data.get('rate_of_change_trend')}")
    except Exception as e:
        record("POST /forecast/water-level (Trinayakudam Station)", False, str(e))

    # 16. Ridge Regression Dam Station Rejection (Maniyar Dam)
    try:
        dam_payload = {
            "station_name": "MANIYAR DAM",
            "readings": readings
        }
        r = requests.post(f"{BASE_URL}/forecast/water-level", json=dam_payload, timeout=5)
        passed = (r.status_code == 400 and "barrage" in r.text.lower())
        record("POST /forecast/water-level (Maniyar Dam Rejection)", passed,
               f"Safely rejected with status {r.status_code}: {r.json().get('detail')[:70]}...")
    except Exception as e:
        record("POST /forecast/water-level (Maniyar Dam Rejection)", False, str(e))

    # 17. Weather Service (Open-Meteo Integration)
    try:
        r = requests.get(f"{BASE_URL}/weather/live?latitude=9.9482&longitude=76.5412", timeout=8)
        data = r.json()
        passed = (r.status_code == 200 and "current_temperature_c" in data and "data_source" in data)
        record("GET /weather/live (Open-Meteo with cache/fallback)", passed,
               f"Temp: {data.get('current_temperature_c')}C, Condition: {data.get('weather_condition')}, Source: {data.get('data_source')}")
    except Exception as e:
        record("GET /weather/live", False, str(e))

    # 18. Weather Service for Monitored Water Body
    try:
        r = requests.get(f"{BASE_URL}/weather/water-body/1", timeout=8)
        data = r.json()
        passed = (r.status_code == 200 and data.get("water_body_id") == 1)
        record("GET /weather/water-body/1", passed,
               f"Site: {data.get('water_body_name')}, Temp: {data.get('current_temperature_c')}C")
    except Exception as e:
        record("GET /weather/water-body/1", False, str(e))

    # 19. Authority Inspection Prioritization
    try:
        r = requests.get(f"{BASE_URL}/authority/inspection-prioritization", timeout=5)
        data = r.json()
        sites = data.get("prioritized_sites", [])
        passed = (r.status_code == 200 and len(sites) > 0 and "priority_scoring_methodology" in data)
        record("GET /authority/inspection-prioritization", passed,
               f"Ranked {len(sites)} sites into priority tiers (Critical count: {data.get('critical_count')})")
    except Exception as e:
        record("GET /authority/inspection-prioritization", False, str(e))

    # 20. Inspection Database Persistence (POST - Write)
    created_id = None
    try:
        insp_payload = {
            "water_body_id": 1,
            "water_body_name": "Ramamangalam Bridge",
            "water_body_type": "river",
            "district": "Ernakulam",
            "priority_tier": "HIGH",
            "priority_rank_score": 72.5,
            "inspector_name": "KSDMA Audit Squad 1",
            "scheduled_date": "2026-11-02",
            "environmental_hazard_score": 45.0,
            "composite_risk_score": 45.0,
            "contributing_factors": ["Seasonal runoff", "Public ghat presence"],
            "suggested_focus": ["Check river gauge", "Audit warning signs"],
            "findings_notes": "Live test audit record",
            "action_required": True
        }
        r = requests.post(f"{BASE_URL}/authority/inspections", json=insp_payload, timeout=5)
        data = r.json()
        created_id = data.get("id")
        passed = (r.status_code == 201 and created_id is not None and data.get("status") == "SCHEDULED")
        record("POST /authority/inspections (DB Write)", passed,
               f"Created inspection ID: {created_id}, status: {data.get('status')}")
    except Exception as e:
        record("POST /authority/inspections (DB Write)", False, str(e))

    # 21. Inspection Database Persistence (PATCH - Update lifecycle)
    if created_id:
        try:
            patch_payload = {
                "status": "COMPLETED",
                "completed_date": "2026-10-30T12:00:00Z",
                "safety_measures_verified": ["Warning board intact", "Lifebuoy verified"],
                "findings_notes": "Completed live audit verification successfully",
                "action_required": False
            }
            r = requests.patch(f"{BASE_URL}/authority/inspections/{created_id}", json=patch_payload, timeout=5)
            data = r.json()
            passed = (r.status_code == 200 and data.get("status") == "COMPLETED" and len(data.get("safety_measures_verified", [])) == 2)
            record("PATCH /authority/inspections/{id} (DB Lifecycle Update)", passed,
                   f"Updated ID {created_id} to status: {data.get('status')}, verified measures: {data.get('safety_measures_verified')}")
        except Exception as e:
            record("PATCH /authority/inspections/{id}", False, str(e))

    # 22. Inspection Trends (N < 5 threshold rule)
    try:
        r = requests.get(f"{BASE_URL}/authority/inspections/trends/summary", timeout=5)
        data = r.json()
        passed = (r.status_code == 200 and "has_sufficient_history" in data and "summary" in data)
        record("GET /authority/inspections/trends/summary (Truthful sample rule)", passed,
               f"Has sufficient history: {data.get('has_sufficient_history')}, Records: {data.get('total_records')}")
    except Exception as e:
        record("GET /authority/inspections/trends/summary", False, str(e))

    # 23. Alert Channel Status
    try:
        r = requests.get(f"{BASE_URL}/alerts/status", timeout=5)
        data = r.json()
        passed = (r.status_code == 200 and "test_mode_enforced" in data and "webhook_configured" in data)
        record("GET /alerts/status", passed,
               f"Webhook: {data.get('webhook_configured')}, Email: {data.get('email_configured')}, Test Mode: {data.get('test_mode_enforced')}")
    except Exception as e:
        record("GET /alerts/status", False, str(e))

    # 24. Alert Dispatch (Safe Test Mode Simulation)
    try:
        alert_payload = {
            "water_body_name": "Ramamangalam Bridge",
            "severity": "high",
            "message": "Live verification warning notice",
            "channel": "webhook",
            "test_mode": True
        }
        r = requests.post(f"{BASE_URL}/alerts/dispatch", json=alert_payload, timeout=5)
        data = r.json()
        passed = (r.status_code == 200 and data.get("test_mode") is True and data.get("status") == "TEST_MODE_SIMULATED")
        record("POST /alerts/dispatch (Safe test mode)", passed,
               f"Delivery ID: {data.get('delivery_id')}, Status: {data.get('status')}, Test mode: {data.get('test_mode')}")
    except Exception as e:
        record("POST /alerts/dispatch", False, str(e))

    # 25. Alert Deliveries Audit Trail
    try:
        r = requests.get(f"{BASE_URL}/alerts/deliveries?limit=10", timeout=5)
        data = r.json()
        passed = (r.status_code == 200 and isinstance(data, list) and len(data) > 0)
        record("GET /alerts/deliveries", passed, f"Returned {len(data)} delivery audit log entries")
    except Exception as e:
        record("GET /alerts/deliveries", False, str(e))

    # 26. Dashboard Summary Endpoint
    try:
        r = requests.get(f"{BASE_URL}/dashboard", timeout=5)
        data = r.json()
        passed = (r.status_code == 200 and "total_monitored_sites" in data and "high_risk_sites_count" in data)
        record("GET /dashboard", passed,
               f"Total sites: {data.get('total_monitored_sites')}, High risk: {data.get('high_risk_sites_count')}, Safe sites: {data.get('safe_sites_count')}")
    except Exception as e:
        record("GET /dashboard", False, str(e))

    # 27. Automated Hazard Monitoring Status
    try:
        r = requests.get(f"{BASE_URL}/monitoring/status", timeout=5)
        data = r.json()
        passed = (r.status_code == 200 and "is_scheduler_running" in data)
        record("GET /monitoring/status", passed, f"Scheduler running: {data.get('is_scheduler_running')}, Monitored: {len(data.get('monitored_stations', []))}")
    except Exception as e:
        record("GET /monitoring/status", False, str(e))

    # 28. Heuristic Baseline Predictor (POST /predict)
    try:
        pred_req = {
            "water_temp_c": 24.0,
            "flow_rate_cms": 8.0,
            "depth_meters": 6.0,
            "rainfall_last_24h_mm": 35.0,
            "wind_speed_kmh": 20.0,
            "visibility_meters": 500.0,
            "include_ai_explanation": False
        }
        r = requests.post(f"{BASE_URL}/predict", json=pred_req, timeout=5)
        data = r.json()
        passed = (r.status_code == 200 and "risk_score" in data and "risk_level" in data)
        record("POST /predict (Heuristic Baseline)", passed,
               f"Risk score: {data.get('risk_score')}, level: {data.get('risk_level')}, model: {data.get('model_version')}")
    except Exception as e:
        record("POST /predict", False, str(e))

    # 29. Negative Test: 404 for non-existent water body
    try:
        r = requests.get(f"{BASE_URL}/water-bodies/999999", timeout=5)
        passed = (r.status_code == 404)
        record("GET /water-bodies/999999 (Negative 404 check)", passed, f"Safely returned 404 Not Found")
    except Exception as e:
        record("GET /water-bodies/999999 (Negative 404 check)", False, str(e))

    # 30. Negative Test: Invalid Coordinates Validation
    try:
        r = requests.get(f"{BASE_URL}/rivers/nearby?latitude=999.0&longitude=999.0", timeout=5)
        passed = (r.status_code == 422)
        record("GET /rivers/nearby with out-of-bounds coords (Validation check)", passed, f"Safely returned 422 Unprocessable Entity")
    except Exception as e:
        record("GET /rivers/nearby coords check", False, str(e))

    # 31. Negative Test: Forecast insufficient readings (< 13)
    try:
        insufficient_payload = {
            "station_name": "RAMAMANGALAM BRIDGE",
            "readings": [{"timestamp": "2026-10-30T12:00:00Z", "water_level_m": 3.0}]
        }
        r = requests.post(f"{BASE_URL}/forecast/water-level", json=insufficient_payload, timeout=5)
        passed = (r.status_code == 422)
        record("POST /forecast/water-level with < 13 readings (Validation check)", passed, f"Safely returned 422 Unprocessable Entity")
    except Exception as e:
        record("POST /forecast/water-level insufficient readings check", False, str(e))

    print(f"\n=== FINAL SUMMARY: {results['passed']}/{results['total_tests']} PASSED, {results['failed']} FAILED ===")
    
    with open("backend_live_verification_report.json", "w") as f:
        json.dump(results, f, indent=2)

if __name__ == "__main__":
    run_tests()
