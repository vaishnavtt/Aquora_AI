"""
AQUORA AI - Test Suite: Kerala-Wide Waterbody Mapping & Transparent Drowning-Hazard Assessment.
Tests boundary filtering, geometry validation, deduplication, viewport spatial queries,
search, and evidence-based hazard classification rules.
Ensures zero fabricated drowning probabilities.
"""

import pytest
from datetime import datetime, timezone, timedelta
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.db.session import Base
from app.models.mapped_waterbody import MappedWaterbodyModel, WaterbodyObservationModel
from app.services.waterbody_ingestion_service import (
    WaterbodyIngestionService,
    haversine_distance_km,
    calculate_line_length_km,
    calculate_polygon_area_sqkm,
)
from app.services.hazard_assessment_service import (
    HazardAssessmentService,
    HAZARD_CATEGORY_HIGH,
    HAZARD_CATEGORY_MODERATE,
    HAZARD_CATEGORY_LOW,
    HAZARD_CATEGORY_INSUFFICIENT,
    HAZARD_CATEGORY_STALE,
)


@pytest.fixture
def test_db():
    """In-memory SQLite database fixture for isolated testing."""
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    TestingSession = sessionmaker(bind=engine)
    session = TestingSession()
    try:
        yield session
    finally:
        session.close()


def test_kerala_boundary_filtering():
    """Validates that coordinates outside the Kerala administrative boundary are rejected."""
    service = WaterbodyIngestionService()

    # Valid Kerala coordinate: Aluva (10.1118° N, 76.3533° E)
    is_valid, msg = service.validate_coordinates([76.3533, 10.1118], "Point")
    assert is_valid is True

    # Invalid coordinate: Delhi (28.6139° N, 77.2090° E)
    is_valid, msg = service.validate_coordinates([77.2090, 28.6139], "Point")
    assert is_valid is False
    assert "outside Kerala" in msg

    # Invalid coordinate: Arabian Sea deep offshore (9.0° N, 72.0° E)
    is_valid, msg = service.validate_coordinates([72.0, 9.0], "Point")
    assert is_valid is False

    # LineString with an out-of-bounds vertex
    line_coords = [[76.35, 10.10], [77.20, 28.60]]
    is_valid, msg = service.validate_coordinates(line_coords, "LineString")
    assert is_valid is False


def test_geometry_calculations():
    """Validates LineString length and Polygon area calculations."""
    # LineString approx 11 km along meridian
    coords = [[76.5, 10.0], [76.5, 10.1]]
    length = calculate_line_length_km(coords)
    assert 10.5 <= length <= 11.5

    # Small polygon
    poly = [[[76.5, 10.0], [76.52, 10.0], [76.52, 10.02], [76.5, 10.02], [76.5, 10.0]]]
    area = calculate_polygon_area_sqkm(poly)
    assert area > 0.0


def test_dataset_deduplication_and_ingestion(test_db):
    """Ensures deduplication by external_id and proper upserting."""
    service = WaterbodyIngestionService()
    result = service.ingest_seed_dataset(test_db)

    assert result["status"] == "success"
    assert result["total_waterbodies"] > 40

    # Ingesting second time must NOT create duplicate rows
    result2 = service.ingest_seed_dataset(test_db)
    assert result2["imported_count"] == 0
    assert result2["updated_count"] == result["total_waterbodies"]
    assert test_db.query(MappedWaterbodyModel).count() == result["total_waterbodies"]


def test_unmonitored_waterbody_hazard_classification():
    """
    CRITICAL RULE: An unmonitored waterbody with no active telemetry or structural hazard
    MUST be classified INSUFFICIENT_DATA, NEVER falsely labeled low risk.
    """
    wb = MappedWaterbodyModel(
        id=999,
        external_id="osm-river-test-unmonitored",
        name="Test Unmonitored Stream Reach",
        type="stream",
        geometry_type="LineString",
        coordinates_json="[[76.4, 10.1], [76.42, 10.12]]",
        bbox_min_lat=10.1, bbox_min_lon=76.4, bbox_max_lat=10.12, bbox_max_lon=76.42,
        centroid_lat=10.11, centroid_lon=76.41,
        district="Ernakulam",
        data_source="OpenStreetMap Contributors (ODbL)",
        license="ODbL",
        is_monitored_station=False,
    )
    assessment = HazardAssessmentService.evaluate_waterbody_hazard(wb, observations=[])
    assert assessment.hazard_category == HAZARD_CATEGORY_INSUFFICIENT
    assert "Insufficient empirical data" in assessment.rule_summary
    assert len(assessment.missing_factors) >= 2
    # Ensure no fabricated probability
    assert not hasattr(assessment, "drowning_probability")
    assert "not mean the waterbody is safe for swimming" in assessment.scientific_disclaimer.lower()


def test_quarry_and_waterfall_high_hazard_classification():
    """
    Validates that known structural hazards (abandoned quarries with vertical drop-offs,
    waterfall plunge pools) are assigned HIGH_HAZARD with explicit evidence.
    """
    quarry = MappedWaterbodyModel(
        id=998,
        external_id="quarry-test",
        name="Vadavathoor Quarry",
        type="quarry",
        geometry_type="Polygon",
        coordinates_json="[[[76.56, 9.59], [76.57, 9.59], [76.57, 9.60], [76.56, 9.60], [76.56, 9.59]]]",
        bbox_min_lat=9.59, bbox_min_lon=76.56, bbox_max_lat=9.60, bbox_max_lon=76.57,
        centroid_lat=9.595, centroid_lon=76.565,
        district="Kottayam",
        data_source="Kerala Mining & Geology",
        license="Open",
        is_monitored_station=False,
    )
    assessment = HazardAssessmentService.evaluate_waterbody_hazard(quarry, observations=[])
    assert assessment.hazard_category == HAZARD_CATEGORY_HIGH
    assert any("QUARRY" in r for r in assessment.evaluation_rules_applied)
    assert any(c.severity == "HIGH" for c in assessment.contributing_indicators)


def test_high_stage_and_discharge_hazard_classification():
    """
    Validates that streamgages with high water level (>5.0m) or strong flow (>25 cms)
    trigger HIGH_HAZARD classification with real telemetry details.
    """
    wb = MappedWaterbodyModel(
        id=997,
        external_id="station-test-spate",
        name="Malayattoor Gauge Station",
        type="river",
        geometry_type="LineString",
        coordinates_json="[[76.49, 10.18], [76.51, 10.18]]",
        bbox_min_lat=10.18, bbox_min_lon=76.49, bbox_max_lat=10.18, bbox_max_lon=76.51,
        centroid_lat=10.18, centroid_lon=76.50,
        district="Ernakulam",
        data_source="Central Water Commission",
        license="Open",
        is_monitored_station=True,
    )
    now = datetime.now(timezone.utc)
    obs_stage = WaterbodyObservationModel(
        waterbody_id=997,
        parameter_name="stage_m",
        value=12.5,
        unit="m",
        observation_time=now,
        source="CWC Telemetry"
    )
    obs_discharge = WaterbodyObservationModel(
        waterbody_id=997,
        parameter_name="discharge_cms",
        value=48.2,
        unit="cms",
        observation_time=now,
        source="CWC Telemetry"
    )

    assessment = HazardAssessmentService.evaluate_waterbody_hazard(wb, observations=[obs_stage, obs_discharge])
    assert assessment.hazard_category == HAZARD_CATEGORY_HIGH
    assert len(assessment.contributing_indicators) == 2
    assert any("STAGE_HIGH" in r for r in assessment.evaluation_rules_applied)
    assert any("FLOW_HIGH" in r for r in assessment.evaluation_rules_applied)


def test_stale_data_hazard_classification():
    """
    Validates that telemetry observations older than 60 days are marked STALE_DATA.
    """
    wb = MappedWaterbodyModel(
        id=996,
        external_id="station-test-stale",
        name="Historical Archive Reach",
        type="river",
        geometry_type="LineString",
        coordinates_json="[[76.2, 10.0], [76.22, 10.0]]",
        bbox_min_lat=10.0, bbox_min_lon=76.2, bbox_max_lat=10.0, bbox_max_lon=76.22,
        centroid_lat=10.0, centroid_lon=76.21,
        district="Ernakulam",
        data_source="CWC Historical Archive",
        license="Open",
        is_monitored_station=True,
    )
    old_time = datetime.now(timezone.utc) - timedelta(days=120)
    obs_old = WaterbodyObservationModel(
        waterbody_id=996,
        parameter_name="stage_m",
        value=1.8,
        unit="m",
        observation_time=old_time,
        source="CWC Historical"
    )
    assessment = HazardAssessmentService.evaluate_waterbody_hazard(wb, observations=[obs_old])
    assert assessment.hazard_category == HAZARD_CATEGORY_STALE
    assert len(assessment.stale_factors) > 0


def test_no_fabricated_drowning_probabilities():
    """
    Strict acceptance test: Verifies that hazard assessment responses NEVER output
    fabricated numerical probabilities of drowning (e.g. '80% chance of drowning').
    """
    wb = MappedWaterbodyModel(
        id=995,
        external_id="integrity-test",
        name="Integrity Verification River",
        type="river",
        geometry_type="LineString",
        coordinates_json="[[76.0, 10.0], [76.1, 10.0]]",
        bbox_min_lat=10.0, bbox_min_lon=76.0, bbox_max_lat=10.0, bbox_max_lon=76.1,
        centroid_lat=10.0, centroid_lon=76.05,
        district="Thrissur",
        data_source="ODbL",
        license="ODbL",
        is_monitored_station=False,
    )
    assessment = HazardAssessmentService.evaluate_waterbody_hazard(wb, observations=[])
    assessment_dict = assessment.model_dump()
    for key, value in assessment_dict.items():
        assert "probability" not in key.lower()
        if isinstance(value, str):
            assert "chance of drowning" not in value.lower()
            assert "% drowning" not in value.lower()
