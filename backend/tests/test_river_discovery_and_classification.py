"""
AQUORA AI - Test Suite for Location-Aware River Discovery & Authoritative Risk Classification
Verifies:
1. Haversine distance calculations and unit formatting.
2. Coordinate boundary validation for Kerala and global bounds.
3. Authoritative threshold boundaries (LOW < 30, MEDIUM 30-60, HIGH 60-80, VERY HIGH >= 80, NO_PREDICTION).
4. Score normalization between 0-1 probability and 0-100 display scale.
5. Nearby river discovery API (/api/v1/rivers/nearby) with radius filtering & distance sorting.
6. River search API (/api/v1/rivers/search) for stations and OpenStreetMap waterways.
7. River details API (/api/v1/rivers/{river_id}) for monitored vs unmonitored OSM features.
8. Metadata rules endpoint (/api/v1/risk/rules).
9. Handling of invalid, missing, and out-of-bound inputs without silent fallback to MEDIUM.
"""

import math
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.core.risk_classifier import (
    classify_risk_score,
    normalize_probability_to_score,
    classify_probability,
    normalize_risk_level_str,
    get_risk_classification_rules,
    THRESHOLD_LOW_UPPER,
    THRESHOLD_MODERATE_UPPER,
    THRESHOLD_HIGH_UPPER,
    RISK_LEVEL_LOW,
    RISK_LEVEL_MODERATE,
    RISK_LEVEL_HIGH,
    RISK_LEVEL_EXTREME,
    RISK_LEVEL_NO_PREDICTION,
    RISK_CATEGORY_LOW,
    RISK_CATEGORY_MODERATE,
    RISK_CATEGORY_HIGH,
    RISK_CATEGORY_VERY_HIGH,
    RISK_CATEGORY_NO_PREDICTION,
)
from app.core.geospatial import (
    haversine_distance_km,
    haversine_distance_meters,
    format_distance,
    is_valid_coordinate,
    is_kerala_coordinate,
    find_nearby_water_bodies,
    search_waterways_and_stations,
    KERALA_OSM_WATERWAYS,
)


@pytest.fixture
def client():
    return TestClient(app)


# ============================================================================
# 1. HAVERSINE DISTANCE COMPUTATIONS & FORMATTING
# ============================================================================

class TestHaversineComputations:
    def test_haversine_identical_point_is_zero(self):
        dist = haversine_distance_km(9.9482, 76.5412, 9.9482, 76.5412)
        assert dist == 0.0
        assert haversine_distance_meters(9.9482, 76.5412, 9.9482, 76.5412) == 0.0

    def test_haversine_known_kerala_distance(self):
        # Distance from Kochi (9.9312, 76.2673) to Aluva (10.1076, 76.3516) is approx 21.5 km
        dist_km = haversine_distance_km(9.9312, 76.2673, 10.1076, 76.3516)
        assert 19.0 <= dist_km <= 24.0

    def test_haversine_meters_conversion(self):
        dist_m = haversine_distance_meters(9.9482, 76.5412, 9.9542, 76.5452)
        assert dist_m > 0
        assert abs(dist_m - (haversine_distance_km(9.9482, 76.5412, 9.9542, 76.5452) * 1000.0)) < 0.1

    def test_format_distance_under_one_km(self):
        assert format_distance(0.450) == "450 m"
        assert format_distance(0.050) == "50 m"
        assert format_distance(0.999) == "999 m"

    def test_format_distance_over_one_km(self):
        assert format_distance(1.234) == "1.2 km"
        assert format_distance(14.89) == "14.9 km"
        assert format_distance(100.0) == "100.0 km"


# ============================================================================
# 2. COORDINATE BOUNDARY VALIDATION
# ============================================================================

class TestCoordinateValidation:
    def test_valid_coordinates(self):
        assert is_valid_coordinate(9.9482, 76.5412) is True
        assert is_valid_coordinate(0.0, 0.0) is True
        assert is_valid_coordinate(-45.0, 120.0) is True

    def test_invalid_coordinates(self):
        assert is_valid_coordinate(95.0, 76.5412) is False   # Latitude > 90
        assert is_valid_coordinate(-91.0, 76.5412) is False  # Latitude < -90
        assert is_valid_coordinate(9.9482, 185.0) is False   # Longitude > 180
        assert is_valid_coordinate(float('nan'), 76.5412) is False
        assert is_valid_coordinate(None, 76.5412) is False

    def test_kerala_bounding_box(self):
        # Authentically inside Kerala
        assert is_kerala_coordinate(10.1076, 76.3516) is True  # Aluva
        assert is_kerala_coordinate(8.5241, 76.9366) is True   # Thiruvananthapuram
        assert is_kerala_coordinate(11.9845, 75.4012) is True  # Kannur

        # Authentically outside Kerala
        assert is_kerala_coordinate(37.7749, -122.4194) is False  # San Francisco prototype
        assert is_kerala_coordinate(13.0827, 80.2707) is False   # Chennai (East coast)
        assert is_kerala_coordinate(28.6139, 77.2090) is False   # New Delhi


# ============================================================================
# 3. AUTHORITATIVE RISK CLASSIFICATION & THRESHOLD BOUNDARIES
# ============================================================================

class TestRiskClassification:
    def test_threshold_constants(self):
        assert THRESHOLD_LOW_UPPER == 30.0
        assert THRESHOLD_MODERATE_UPPER == 60.0
        assert THRESHOLD_HIGH_UPPER == 80.0

    def test_low_risk_boundary(self):
        level, cat = classify_risk_score(0.0)
        assert level == RISK_LEVEL_LOW
        assert cat == RISK_CATEGORY_LOW

        level, cat = classify_risk_score(29.99)
        assert level == RISK_LEVEL_LOW
        assert cat == RISK_CATEGORY_LOW

    def test_moderate_risk_boundary(self):
        # Score 30.0 is strictly MODERATE
        level, cat = classify_risk_score(30.0)
        assert level == RISK_LEVEL_MODERATE
        assert cat == RISK_CATEGORY_MODERATE

        level, cat = classify_risk_score(45.5)
        assert level == RISK_LEVEL_MODERATE
        assert cat == RISK_CATEGORY_MODERATE

        level, cat = classify_risk_score(59.99)
        assert level == RISK_LEVEL_MODERATE
        assert cat == RISK_CATEGORY_MODERATE

    def test_high_risk_boundary(self):
        # Score 60.0 is strictly HIGH
        level, cat = classify_risk_score(60.0)
        assert level == RISK_LEVEL_HIGH
        assert cat == RISK_CATEGORY_HIGH

        level, cat = classify_risk_score(79.99)
        assert level == RISK_LEVEL_HIGH
        assert cat == RISK_CATEGORY_HIGH

    def test_extreme_risk_boundary(self):
        # Score 80.0 is EXTREME / VERY HIGH
        level, cat = classify_risk_score(80.0)
        assert level == RISK_LEVEL_EXTREME
        assert cat == RISK_CATEGORY_VERY_HIGH

        level, cat = classify_risk_score(100.0)
        assert level == RISK_LEVEL_EXTREME
        assert cat == RISK_CATEGORY_VERY_HIGH

    def test_invalid_and_missing_scores_yield_no_prediction(self):
        # Never silently assign MEDIUM or LOW to invalid/missing records
        assert classify_risk_score(None) == (RISK_LEVEL_NO_PREDICTION, RISK_CATEGORY_NO_PREDICTION)
        assert classify_risk_score(float('nan')) == (RISK_LEVEL_NO_PREDICTION, RISK_CATEGORY_NO_PREDICTION)
        assert classify_risk_score(-5.0) == (RISK_LEVEL_NO_PREDICTION, RISK_CATEGORY_NO_PREDICTION)
        assert classify_risk_score(105.0) == (RISK_LEVEL_NO_PREDICTION, RISK_CATEGORY_NO_PREDICTION)

    def test_normalize_probability_to_score(self):
        # Probabilities between 0.0 and 1.0 converted to 0.0 - 100.0
        assert normalize_probability_to_score(0.0) == 0.0
        assert normalize_probability_to_score(0.25) == 25.0
        assert normalize_probability_to_score(0.50) == 50.0
        assert normalize_probability_to_score(1.0) == 100.0
        assert normalize_probability_to_score(None) is None
        with pytest.raises(ValueError):
            normalize_probability_to_score(1.5)

    def test_classify_probability(self):
        score, level, cat = classify_probability(0.25)
        assert score == 25.0
        assert level == RISK_LEVEL_LOW
        assert cat == RISK_CATEGORY_LOW

        score, level, cat = classify_probability(0.45)
        assert score == 45.0
        assert level == RISK_LEVEL_MODERATE
        assert cat == RISK_CATEGORY_MODERATE

    def test_normalize_risk_level_str(self):
        assert normalize_risk_level_str("low") == ("low", "LOW")
        assert normalize_risk_level_str("safe") == ("low", "LOW")
        assert normalize_risk_level_str("moderate") == ("moderate", "MODERATE")
        assert normalize_risk_level_str("medium") == ("moderate", "MODERATE")
        assert normalize_risk_level_str("high") == ("high", "HIGH")
        assert normalize_risk_level_str("extreme") == ("extreme", "VERY HIGH")
        assert normalize_risk_level_str("critical") == ("extreme", "VERY HIGH")
        assert normalize_risk_level_str(None) == ("no_prediction", "NO_PREDICTION")
        assert normalize_risk_level_str("invalid_tag") == ("no_prediction", "NO_PREDICTION")

    def test_classification_rules_metadata(self):
        rules = get_risk_classification_rules()
        assert "scale" in rules
        assert "thresholds" in rules
        assert "low" in rules["thresholds"]
        assert "moderate" in rules["thresholds"]
        assert "high" in rules["thresholds"]
        assert "extreme" in rules["thresholds"]
        assert "no_prediction" in rules["thresholds"]


# ============================================================================
# 4. NEARBY RIVERS BACKEND API ENDPOINTS
# ============================================================================

class TestNearbyRiversAPI:
    def test_get_nearby_rivers_success(self, client):
        # Ernakulam / Aluva location (10.1076, 76.3516) with 15 km radius
        response = client.get("/api/v1/rivers/nearby?latitude=10.1076&longitude=76.3516&radius_km=15")
        assert response.status_code == 200
        data = response.json()
        assert data["center_latitude"] == 10.1076
        assert data["center_longitude"] == 76.3516
        assert data["radius_km"] == 15.0
        assert data["total_found"] >= 1
        assert "rivers" in data

        # Results must be strictly sorted by distance ascending
        rivers = data["rivers"]
        distances = [r["distance_km"] for r in rivers]
        assert distances == sorted(distances)

        # First result should be closest
        first = rivers[0]
        assert "name" in first
        assert "type" in first
        assert "distance_km" in first
        assert "distance_formatted" in first
        assert first["distance_km"] <= 15.0

    def test_get_nearby_rivers_radius_filtering(self, client):
        # Query with small 3 km radius vs large 25 km radius
        res_small = client.get("/api/v1/rivers/nearby?latitude=9.9482&longitude=76.5412&radius_km=3")
        res_large = client.get("/api/v1/rivers/nearby?latitude=9.9482&longitude=76.5412&radius_km=25")
        assert res_small.status_code == 200
        assert res_large.status_code == 200

        small_count = res_small.json()["total_found"]
        large_count = res_large.json()["total_found"]
        assert large_count >= small_count

    def test_get_nearby_rivers_empty_when_no_features(self, client):
        # Middle of the Indian Ocean south of Sri Lanka (2.0°N, 76.0°E) with 2km radius
        response = client.get("/api/v1/rivers/nearby?latitude=2.0&longitude=76.0&radius_km=2")
        assert response.status_code == 200
        data = response.json()
        assert data["total_found"] == 0
        assert len(data["rivers"]) == 0

    def test_get_nearby_rivers_invalid_coordinates(self, client):
        # Latitude out of bounds
        response = client.get("/api/v1/rivers/nearby?latitude=95.0&longitude=76.5&radius_km=10")
        assert response.status_code == 422

        # Radius too large (> 50 km)
        response_bad_radius = client.get("/api/v1/rivers/nearby?latitude=10.0&longitude=76.5&radius_km=100")
        assert response_bad_radius.status_code == 422


# ============================================================================
# 5. RIVER SEARCH API ENDPOINT
# ============================================================================

class TestRiverSearchAPI:
    def test_search_rivers_by_name(self, client):
        response = client.get("/api/v1/rivers/search?q=Periyar")
        assert response.status_code == 200
        data = response.json()
        assert data["query"] == "Periyar"
        assert data["total_found"] >= 1
        names = [r["name"] for r in data["results"]]
        assert any("Periyar" in name for name in names)

    def test_search_rivers_by_district(self, client):
        response = client.get("/api/v1/rivers/search?q=Kottayam")
        assert response.status_code == 200
        data = response.json()
        assert data["total_found"] >= 1

    def test_search_rivers_empty_query(self, client):
        # Query min_length=1 enforced by FastAPI validation
        response = client.get("/api/v1/rivers/search?q=")
        assert response.status_code == 422


# ============================================================================
# 6. RIVER DETAILS & OPENSTREETMAP DISTINCTION
# ============================================================================

class TestRiverDetailsAPI:
    def test_get_monitored_river_details(self, client):
        # ID 1 is Ramamangalam Bridge
        response = client.get("/api/v1/rivers/1")
        assert response.status_code == 200
        data = response.json()
        assert data["name"] is not None
        assert data["is_monitored_station"] is True
        assert data["has_prediction"] is True
        assert data["current_risk_level"] in ["low", "moderate", "high", "extreme"]

    def test_get_unmonitored_osm_river_details(self, client):
        # ID 10001 is Periyar River (Aluva Ghat reach) from OpenStreetMap
        response = client.get("/api/v1/rivers/10001")
        assert response.status_code == 200
        data = response.json()
        assert "Periyar" in data["name"]
        assert data["is_monitored_station"] is False
        assert data["has_prediction"] is False
        assert data["current_risk_level"] == "no_prediction"
        assert data["risk_category"] == "NO_PREDICTION"
        assert data["risk_score"] is None
        assert "OpenStreetMap" in data["data_source"]

    def test_get_nonexistent_river(self, client):
        response = client.get("/api/v1/rivers/999999")
        assert response.status_code == 404


# ============================================================================
# 7. RISK RULES METADATA ENDPOINT
# ============================================================================

class TestRiskRulesAPI:
    def test_get_risk_rules(self, client):
        response = client.get("/api/v1/risk/rules")
        assert response.status_code == 200
        data = response.json()
        assert data["scale"] == "0 to 100 composite index"
        assert "low" in data["thresholds"]
        assert data["thresholds"]["low"]["max_exclusive"] == 30.0
        assert data["thresholds"]["moderate"]["min"] == 30.0
        assert data["thresholds"]["moderate"]["max_exclusive"] == 60.0
        assert data["thresholds"]["high"]["min"] == 60.0
        assert "scientific_disclaimer" in data
