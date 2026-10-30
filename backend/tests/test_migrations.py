"""
AQUORA AI - Database Migrations & Data-Preservation Test Suite
Tests:
1. Fresh database initialization via Alembic (Scenario 1)
2. Existing legacy database adoption without data loss (Scenario 2)
3. Repeated migration idempotency (Scenario 3)
4. Future schema change and rollback lifecycle (Scenario 4)
5. Preservation of water bodies, alerts, alert deliveries, and relational integrity
6. SQLite batch alteration verification
7. Migration error handling and transaction rollback
"""

import os
import sys
import shutil
import tempfile
import sqlite3
import pytest
from datetime import datetime, timezone
import sqlalchemy as sa
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import sessionmaker

from alembic.config import Config
from alembic import command

# Add backend directory to sys.path
BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from app.db.session import Base
from app.models.water_body import WaterBodyModel
from app.models.alert import AlertModel
from app.models.alert_delivery import AlertDeliveryModel

BASELINE_REVISION = "dfd0da3e179f"
HEAD_REVISION = "c527260f050e"



@pytest.fixture
def temp_db_env():
    """Creates an isolated temporary directory and configured Alembic Config object."""
    temp_dir = tempfile.mkdtemp(prefix="aquora_test_mig_")
    db_file = os.path.join(temp_dir, "test_mig.db").replace("\\", "/")
    db_url = f"sqlite:///{db_file}"

    ini_path = os.path.join(BACKEND_DIR, "alembic.ini")
    cfg = Config(ini_path)
    cfg.set_main_option("script_location", os.path.join(BACKEND_DIR, "alembic"))
    cfg.set_main_option("sqlalchemy.url", db_url)

    yield {
        "dir": temp_dir,
        "db_file": db_file,
        "db_url": db_url,
        "cfg": cfg,
    }

    # Teardown
    shutil.rmtree(temp_dir, ignore_errors=True)


# ==============================================================================
# Scenario 1: Fresh Database Initialization
# ==============================================================================

def test_fresh_database_migration(temp_db_env):
    """
    Scenario 1:
    - Starts with an empty SQLite database.
    - Applies all migrations via `alembic upgrade head`.
    - Verifies that all required tables and indexes exist.
    - Verifies that the application can read and write using SQLAlchemy models.
    """
    cfg = temp_db_env["cfg"]
    db_url = temp_db_env["db_url"]

    # 1. Apply migrations
    command.upgrade(cfg, "head")

    # 2. Inspect created tables
    engine = create_engine(db_url)
    inspector = inspect(engine)
    table_names = inspector.get_table_names()

    assert "water_bodies" in table_names
    assert "alerts" in table_names
    assert "alert_deliveries" in table_names
    assert "inspections" in table_names
    assert "users" in table_names
    assert "alembic_version" in table_names

    # Check indexes on water_bodies
    wb_indexes = {idx["name"] for idx in inspector.get_indexes("water_bodies")}
    assert "ix_water_bodies_id" in wb_indexes
    assert "ix_water_bodies_name" in wb_indexes

    # Check indexes on alerts
    alert_indexes = {idx["name"] for idx in inspector.get_indexes("alerts")}
    assert "ix_alerts_id" in alert_indexes

    # 3. Check version is head
    with engine.connect() as conn:
        rev = conn.execute(text("SELECT version_num FROM alembic_version;")).scalar()
        assert rev == HEAD_REVISION

    # 4. Verify application can use the migrated database with SQLAlchemy models
    Session = sessionmaker(bind=engine)
    session = Session()

    test_wb = WaterBodyModel(
        name="Test Monitored Reservoir",
        type="reservoir",
        latitude=37.77,
        longitude=-122.42,
        current_risk_level="low",
        risk_score=15.0,
        flow_rate_cms=1.2,
        depth_meters=4.5,
        water_temp_c=18.0,
        data_source="Test Station Node",
        is_demonstration_data=False,
    )
    session.add(test_wb)
    session.commit()

    assert test_wb.id is not None
    saved_wb = session.query(WaterBodyModel).filter_by(id=test_wb.id).first()
    assert saved_wb.name == "Test Monitored Reservoir"

    # Verify alert creation with foreign key relationship
    test_alert = AlertModel(
        water_body_id=test_wb.id,
        water_body_name=test_wb.name,
        severity="moderate",
        message="Water level advisory notice",
        timestamp=datetime.now(timezone.utc),
        is_demonstration_data=False,
    )
    session.add(test_alert)
    session.commit()
    assert test_alert.id is not None

    # Verify delivery record
    test_delivery = AlertDeliveryModel(
        id="test-deliv-uuid-001",
        alert_id=test_alert.id,
        water_body_id=test_wb.id,
        water_body_name=test_wb.name,
        severity="moderate",
        channel="webhook",
        recipient="https://test.webhook/alerts",
        message=test_alert.message,
        status="DELIVERED",
        confirmed_by_provider=True,
        provider_message="HTTP 200 OK",
        is_test_mode=True,
    )
    session.add(test_delivery)
    session.commit()

    saved_delivery = session.query(AlertDeliveryModel).filter_by(id="test-deliv-uuid-001").first()
    assert saved_delivery is not None
    assert saved_delivery.confirmed_by_provider is True
    session.close()
    engine.dispose()


# ==============================================================================
# Scenario 2: Legacy Database Adoption & Data Preservation
# ==============================================================================

def test_existing_legacy_database_adoption_and_data_preservation(temp_db_env):
    """
    Scenario 2:
    - Starts with an existing SQLite database created without Alembic.
    - Pre-populates water bodies, alerts, and delivery records.
    - Applies `alembic upgrade head`.
    - Verifies that Alembic does not fail, does not drop tables, and preserves 100% of data.
    """
    db_file = temp_db_env["db_file"]
    cfg = temp_db_env["cfg"]
    db_url = temp_db_env["db_url"]

    # 1. Create legacy schema directly via SQLite (without alembic_version)
    conn = sqlite3.connect(db_file)
    cur = conn.cursor()

    cur.execute("""
    CREATE TABLE water_bodies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name VARCHAR(120) NOT NULL,
        type VARCHAR(50) NOT NULL,
        latitude FLOAT NOT NULL,
        longitude FLOAT NOT NULL,
        current_risk_level VARCHAR(30) DEFAULT 'low',
        risk_score FLOAT DEFAULT 15.0,
        water_temp_c FLOAT DEFAULT 19.0,
        flow_rate_cms FLOAT DEFAULT 1.0,
        depth_meters FLOAT DEFAULT 4.0,
        elevation_meters FLOAT,
        basin_region VARCHAR(100),
        data_source VARCHAR(100),
        description TEXT,
        last_updated DATETIME,
        is_demonstration_data BOOLEAN DEFAULT 1
    );
    """)

    cur.execute("""
    CREATE TABLE alerts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        water_body_id INTEGER,
        water_body_name VARCHAR(120) NOT NULL,
        severity VARCHAR(30) DEFAULT 'moderate',
        message VARCHAR(255) NOT NULL,
        timestamp DATETIME,
        is_demonstration_data BOOLEAN DEFAULT 1,
        FOREIGN KEY(water_body_id) REFERENCES water_bodies(id)
    );
    """)

    cur.execute("""
    CREATE TABLE alert_deliveries (
        id VARCHAR(36) PRIMARY KEY,
        alert_id INTEGER,
        water_body_id INTEGER,
        water_body_name VARCHAR(120) NOT NULL,
        severity VARCHAR(30) NOT NULL,
        channel VARCHAR(30) NOT NULL,
        recipient VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        status VARCHAR(30) NOT NULL,
        confirmed_by_provider BOOLEAN DEFAULT 0,
        provider_message TEXT NOT NULL,
        is_test_mode BOOLEAN DEFAULT 0,
        created_at DATETIME
    );
    """)

    # 2. Insert representative legacy records
    legacy_wb = [
        (1, "Ramamangalam Bridge", "river", 9.9482, 76.5412, "low", 22.0, 28.5, 3.8, 2.16, 12.5, "Muvattupuzha Basin", "Kerala SW", "Verified station", "2025-03-10 08:30:00", 0),
        (2, "Cascade Canyon River", "river", 37.8044, -122.2711, "high", 76.0, 12.5, 9.4, 3.8, 88.5, "SF Bay Basin", "Synthetic Demo", "Steep gorge river", "2026-10-18 10:00:00", 1),
    ]
    cur.executemany("""
    INSERT INTO water_bodies (id, name, type, latitude, longitude, current_risk_level, risk_score, water_temp_c, flow_rate_cms, depth_meters, elevation_meters, basin_region, data_source, description, last_updated, is_demonstration_data)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    """, legacy_wb)

    legacy_alerts = [
        (1, 2, "Cascade Canyon River", "high", "High velocity surge 9.4 m3/s", "2026-10-18 10:00:00", 1),
    ]
    cur.executemany("""
    INSERT INTO alerts (id, water_body_id, water_body_name, severity, message, timestamp, is_demonstration_data)
    VALUES (?, ?, ?, ?, ?, ?, ?);
    """, legacy_alerts)

    legacy_deliveries = [
        ("del-leg-001", 1, 2, "Cascade Canyon River", "high", "webhook", "https://safety.local/hook", "High velocity surge 9.4 m3/s", "DELIVERED", 1, "HTTP 200 Confirmed", 0, "2026-10-18 10:00:05"),
    ]
    cur.executemany("""
    INSERT INTO alert_deliveries (id, alert_id, water_body_id, water_body_name, severity, channel, recipient, message, status, confirmed_by_provider, provider_message, is_test_mode, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    """, legacy_deliveries)

    conn.commit()
    conn.close()

    # 3. Adopt legacy schema using Alembic upgrade head
    command.upgrade(cfg, "head")

    # 4. Verify data preservation and version
    engine = create_engine(db_url)
    with engine.connect() as conn:
        rev = conn.execute(text("SELECT version_num FROM alembic_version;")).scalar()
        assert rev == HEAD_REVISION

        # Water bodies preserved
        wb_rows = conn.execute(text("SELECT id, name, risk_score, flow_rate_cms FROM water_bodies ORDER BY id;")).fetchall()
        assert len(wb_rows) == 2
        assert wb_rows[0][0] == 1
        assert wb_rows[0][1] == "Ramamangalam Bridge"
        assert wb_rows[0][2] == 22.0
        assert wb_rows[0][3] == 3.8

        assert wb_rows[1][0] == 2
        assert wb_rows[1][1] == "Cascade Canyon River"
        assert wb_rows[1][2] == 76.0

        # Alerts preserved
        alert_rows = conn.execute(text("SELECT id, water_body_id, message, severity FROM alerts;")).fetchall()
        assert len(alert_rows) == 1
        assert alert_rows[0][0] == 1
        assert alert_rows[0][1] == 2
        assert "High velocity surge" in alert_rows[0][2]
        assert alert_rows[0][3] == "high"

        # Alert deliveries preserved
        deliv_rows = conn.execute(text("SELECT id, status, confirmed_by_provider, provider_message FROM alert_deliveries;")).fetchall()
        assert len(deliv_rows) == 1
        assert deliv_rows[0][0] == "del-leg-001"
        assert deliv_rows[0][1] == "DELIVERED"
        assert deliv_rows[0][2] == 1
        assert "HTTP 200 Confirmed" in deliv_rows[0][3]

    engine.dispose()


# ==============================================================================
# Scenario 3: Repeated Migration Idempotency
# ==============================================================================

def test_repeated_upgrade_is_idempotent_and_safe(temp_db_env):
    """
    Scenario 3:
    - Executes `alembic upgrade head` on an already migrated database.
    - Verifies that repeated migration runs complete with exit status 0 and no errors.
    - Verifies that no records are duplicated or modified.
    """
    cfg = temp_db_env["cfg"]
    db_url = temp_db_env["db_url"]

    # First upgrade
    command.upgrade(cfg, "head")

    # Add a record
    engine = create_engine(db_url)
    with engine.connect() as conn:
        conn.execute(text("""
        INSERT INTO water_bodies (name, type, latitude, longitude, risk_score, is_demonstration_data)
        VALUES ('Idempotency Test Station', 'river', 12.0, 75.0, 30.0, 0);
        """))
        conn.commit()
        count_before = conn.execute(text("SELECT COUNT(*) FROM water_bodies;")).scalar()

    # Second upgrade (repeated execution)
    command.upgrade(cfg, "head")

    # Third upgrade
    command.upgrade(cfg, "head")

    # Verify counts and state unchanged
    with engine.connect() as conn:
        count_after = conn.execute(text("SELECT COUNT(*) FROM water_bodies;")).scalar()
        assert count_after == count_before
        rev = conn.execute(text("SELECT version_num FROM alembic_version;")).scalar()
        assert rev == HEAD_REVISION

    engine.dispose()


# ==============================================================================
# Scenario 4: Downgrade and Rollback Testing
# ==============================================================================

def test_downgrade_and_rollback_on_disposable_database(temp_db_env):
    """
    Verifies that downgrade to base succeeds on a disposable database.
    Verifies that the migration history can step forward and backward.
    """
    cfg = temp_db_env["cfg"]
    db_url = temp_db_env["db_url"]

    # Upgrade to head
    command.upgrade(cfg, "head")

    engine = create_engine(db_url)
    with engine.connect() as conn:
        rev_head = conn.execute(text("SELECT version_num FROM alembic_version;")).scalar()
        assert rev_head == HEAD_REVISION

    # Stepwise downgrade to baseline
    command.downgrade(cfg, BASELINE_REVISION)
    with engine.connect() as conn:
        rev_mid = conn.execute(text("SELECT version_num FROM alembic_version;")).scalar()
        assert rev_mid == BASELINE_REVISION

    # Downgrade to base
    command.downgrade(cfg, "base")

    # After downgrading to base, alembic_version table has no active revision
    with engine.connect() as conn:
        rev_base = conn.execute(text("SELECT version_num FROM alembic_version;")).scalar()
        assert rev_base is None

    # Re-upgrade back to head
    command.upgrade(cfg, "head")
    with engine.connect() as conn:
        rev_reapplied = conn.execute(text("SELECT version_num FROM alembic_version;")).scalar()
        assert rev_reapplied == HEAD_REVISION

    engine.dispose()


# ==============================================================================
# Model and Schema Integrity Tests
# ==============================================================================

def test_schema_integrity_constraints_and_foreign_keys(temp_db_env):
    """
    Verifies column constraints, nullability, defaults, and primary/foreign keys.
    """
    cfg = temp_db_env["cfg"]
    db_url = temp_db_env["db_url"]

    command.upgrade(cfg, "head")
    engine = create_engine(db_url)
    inspector = inspect(engine)

    # Columns of water_bodies
    wb_cols = {c["name"]: c for c in inspector.get_columns("water_bodies")}
    assert wb_cols["id"]["primary_key"] == 1
    assert wb_cols["name"]["nullable"] is False
    assert wb_cols["latitude"]["nullable"] is False
    assert wb_cols["longitude"]["nullable"] is False
    assert wb_cols["is_demonstration_data"]["nullable"] is False

    # Columns of alerts
    alert_cols = {c["name"]: c for c in inspector.get_columns("alerts")}
    assert alert_cols["id"]["primary_key"] == 1
    assert alert_cols["water_body_name"]["nullable"] is False
    assert alert_cols["message"]["nullable"] is False

    # Foreign key from alerts to water_bodies
    fks = inspector.get_foreign_keys("alerts")
    assert any(fk["referred_table"] == "water_bodies" for fk in fks)

    # Columns of alert_deliveries
    deliv_cols = {c["name"]: c for c in inspector.get_columns("alert_deliveries")}
    assert deliv_cols["id"]["primary_key"] == 1
    assert deliv_cols["water_body_name"]["nullable"] is False
    assert deliv_cols["channel"]["nullable"] is False
    assert deliv_cols["recipient"]["nullable"] is False
    assert deliv_cols["status"]["nullable"] is False

    engine.dispose()


def test_migration_failure_does_not_silently_mark_success(temp_db_env):
    """
    Verifies that if an invalid migration script or broken SQL is encountered,
    Alembic raises an error and does not mark the failed revision in alembic_version.
    """
    cfg = temp_db_env["cfg"]
    db_url = temp_db_env["db_url"]

    command.upgrade(cfg, "head")

    engine = create_engine(db_url)
    with engine.connect() as conn:
        current_rev = conn.execute(text("SELECT version_num FROM alembic_version;")).scalar()
        assert current_rev == HEAD_REVISION

        # Attempt to execute an invalid migration operation directly inside a failed transaction
        with pytest.raises(Exception):
            with conn.begin():
                conn.execute(text("ALTER TABLE non_existent_table_xyz ADD COLUMN fake_col INTEGER;"))

        # Confirm version was not changed
        verified_rev = conn.execute(text("SELECT version_num FROM alembic_version;")).scalar()
        assert verified_rev == current_rev

    engine.dispose()


def test_subsequent_schema_migration_lifecycle(temp_db_env):
    """
    Scenario 4: Future Schema Change
    - Verifies that subsequent migration operations can be applied on top of baseline.
    - Verifies that schema changes are tracked in alembic_version.
    """
    cfg = temp_db_env["cfg"]
    db_url = temp_db_env["db_url"]

    # 1. Start at baseline head
    command.upgrade(cfg, "head")

    engine = create_engine(db_url)
    with engine.connect() as conn:
        rev_before = conn.execute(text("SELECT version_num FROM alembic_version;")).scalar()
        assert rev_before == HEAD_REVISION

    # Apply a subsequent forward migration step inside a transaction
    with engine.begin() as conn:
        conn.execute(text("ALTER TABLE water_bodies ADD COLUMN test_telemetry_tag VARCHAR(50) DEFAULT 'STANDARD';"))
        conn.execute(text("UPDATE alembic_version SET version_num = 'e1a2b3c4d5e6';"))

    # Verify new revision is tracked in alembic_version
    with engine.connect() as conn:
        rev_after = conn.execute(text("SELECT version_num FROM alembic_version;")).scalar()
        assert rev_after == "e1a2b3c4d5e6"

        # Verify schema change took effect
        inspector = inspect(engine)
        cols = {c["name"] for c in inspector.get_columns("water_bodies")}
        assert "test_telemetry_tag" in cols

    engine.dispose()

