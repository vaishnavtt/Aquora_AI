"""
Tests for database initialization, idempotency, and model CRUD operations.
"""

from datetime import datetime, timezone
try:
    from app.models.water_body import WaterBodyModel
    from app.models.alert import AlertModel
    from app.db.init_db import get_demonstration_water_bodies
except ImportError:
    from backend.app.models.water_body import WaterBodyModel
    from backend.app.models.alert import AlertModel
    from backend.app.db.init_db import get_demonstration_water_bodies

def test_demonstration_water_bodies_structure():
    """Verifies demonstration water bodies meet schema and ethics requirements."""
    sites = get_demonstration_water_bodies()
    assert len(sites) == 6
    for site in sites:
        assert site.is_demonstration_data is True
        assert "[DEMONSTRATION DATA]" in site.description
        assert "Demonstration Station" in site.name
        assert site.latitude != 0.0
        assert site.longitude != 0.0
        assert site.current_risk_level in ["low", "moderate", "high", "extreme"]

def test_database_crud_operations(db_session):
    """Verifies creating, reading, updating, and deleting records in SQLite."""
    # Create custom station
    new_station = WaterBodyModel(
        name="Test Lagoon (Demonstration)",
        type="lake",
        latitude=37.7000,
        longitude=-122.4000,
        current_risk_level="low",
        risk_score=12.0,
        water_temp_c=22.0,
        flow_rate_cms=0.2,
        depth_meters=3.0,
        last_updated=datetime.now(timezone.utc),
        description="[DEMONSTRATION DATA] Test station.",
        is_demonstration_data=True
    )
    db_session.add(new_station)
    db_session.commit()

    # Query back
    queried = db_session.query(WaterBodyModel).filter_by(name="Test Lagoon (Demonstration)").first()
    assert queried is not None
    assert queried.type == "lake"
    assert queried.risk_score == 12.0

    # Update
    queried.current_risk_level = "moderate"
    queried.risk_score = 45.0
    db_session.commit()

    updated = db_session.query(WaterBodyModel).filter_by(name="Test Lagoon (Demonstration)").first()
    assert updated.current_risk_level == "moderate"
    assert updated.risk_score == 45.0

    # Delete
    db_session.delete(updated)
    db_session.commit()
    deleted = db_session.query(WaterBodyModel).filter_by(name="Test Lagoon (Demonstration)").first()
    assert deleted is None
