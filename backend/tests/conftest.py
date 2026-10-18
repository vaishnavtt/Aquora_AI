"""
Pytest configuration and test fixtures for AQUORA AI backend test suite.
Uses an isolated in-memory SQLite database per test session to avoid
mutating the local database file.
"""

import sys
import os
import pytest
from datetime import datetime, timezone
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from fastapi.testclient import TestClient

# Ensure root directory and backend directory are on python path
test_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.dirname(test_dir)
root_dir = os.path.dirname(backend_dir)
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)
if root_dir not in sys.path:
    sys.path.insert(0, root_dir)

try:
    from app.db.session import Base, get_db
    from app.models.water_body import WaterBodyModel
    from app.models.alert import AlertModel
    from app.models.alert_delivery import AlertDeliveryModel
    from app.db.init_db import get_demonstration_water_bodies, init_database
    from app.main import app
    from app.ml.predictor import prediction_service
except ImportError:
    from backend.app.db.session import Base, get_db
    from backend.app.models.water_body import WaterBodyModel
    from backend.app.models.alert import AlertModel
    from backend.app.models.alert_delivery import AlertDeliveryModel
    from backend.app.db.init_db import get_demonstration_water_bodies, init_database
    from backend.app.main import app
    from backend.app.ml.predictor import prediction_service

# In-memory SQLite engine with StaticPool for thread-safe test isolation
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

test_engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    """Initializes tables in the in-memory SQLite database for the test session."""
    init_database()
    Base.metadata.create_all(bind=test_engine)
    yield
    Base.metadata.drop_all(bind=test_engine)

@pytest.fixture(scope="function")
def db_session():
    """Provides a clean transactional database session populated with baseline demo data."""
    Base.metadata.drop_all(bind=test_engine)
    Base.metadata.create_all(bind=test_engine)
    session = TestingSessionLocal()
    
    # Populate standard demonstration benchmark records
    demo_sites = get_demonstration_water_bodies()
    session.add_all(demo_sites)
    session.commit()

    cascade_site = session.query(WaterBodyModel).filter(
        WaterBodyModel.name.like("%Cascade%")
    ).first()

    if cascade_site:
        demo_alert = AlertModel(
            water_body_id=cascade_site.id,
            water_body_name=cascade_site.name,
            severity="high",
            message="[DEMONSTRATION ALERT] Water flow velocity elevated past safe threshold (9.4 m³/s). Swimming discouraged.",
            timestamp=datetime.now(timezone.utc),
            is_demonstration_data=True
        )
        session.add(demo_alert)
        session.commit()

    yield session
    session.close()

@pytest.fixture(scope="function")
def client(db_session):
    """Provides a TestClient with the database dependency overridden by the test session."""
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    # Ensure predictor is at baseline
    prediction_service.reset_to_baseline()
    
    with TestClient(app) as test_client:
        yield test_client
    
    app.dependency_overrides.clear()
    prediction_service.reset_to_baseline()
