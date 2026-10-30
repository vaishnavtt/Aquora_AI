"""
AQUORA AI - Data Management, Export, Import & Database Backup Test Suite
Tests:
- CSV export for monitored water bodies and inspection ledgers
- CSV import with field validation, duplicate detection, and Kerala bounds tagging
- Database binary backup snapshot with SQLite format validation
"""

import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.db.session import SessionLocal
from app.models.water_body import WaterBodyModel


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c


def test_export_water_bodies_csv(client):
    res = client.get("/api/v1/data/export/water-bodies")
    assert res.status_code == 200
    assert res.headers["content-type"].startswith("text/csv")
    assert "attachment; filename=aquora_water_bodies_" in res.headers["content-disposition"]
    
    text = res.text
    lines = [l.strip() for l in text.splitlines() if l.strip()]
    assert len(lines) >= 2  # Header + at least one water body
    header = lines[0]
    assert "name" in header
    assert "latitude" in header
    assert "longitude" in header
    assert "current_risk_level" in header
    assert "risk_score" in header


def test_export_inspections_csv(client):
    res = client.get("/api/v1/data/export/inspections")
    assert res.status_code == 200
    assert res.headers["content-type"].startswith("text/csv")
    assert "attachment; filename=aquora_inspections_" in res.headers["content-disposition"]

    text = res.text
    lines = [l.strip() for l in text.splitlines() if l.strip()]
    assert len(lines) >= 1  # Header present
    assert "water_body_name" in lines[0]
    assert "priority_tier" in lines[0]
    assert "status" in lines[0]


def test_import_water_bodies_csv_success(client):
    # Ensure clean slate for imported test water bodies
    db_clean = SessionLocal()
    db_clean.query(WaterBodyModel).filter(
        WaterBodyModel.name.in_(["Meenachil Upper Reach", "Pamba River Rapid Zone"])
    ).delete(synchronize_session=False)
    db_clean.commit()
    db_clean.close()

    csv_data = """name,type,latitude,longitude,risk_score,depth_meters,flow_rate_cms,basin_region,description
Meenachil Upper Reach,river,9.6800,76.6200,42.5,3.2,4.8,Meenachil Basin,Upper gauge upstream of Pala
Pamba River Rapid Zone,river,9.3500,76.8000,58.0,4.5,7.1,Pamba Basin,Fast-flowing section prone to sudden stage rises
"""
    res = client.post(
        "/api/v1/data/import/water-bodies",
        json=csv_data,
    )
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert data["imported_count"] == 2
    assert data["skipped_duplicates_count"] == 0

    # Verify rows exist in database
    db = SessionLocal()
    wb = db.query(WaterBodyModel).filter(WaterBodyModel.name == "Meenachil Upper Reach").first()
    assert wb is not None
    assert wb.type == "river"
    assert wb.basin_region == "Meenachil Basin"
    db.close()


def test_import_water_bodies_duplicate_rejection(client):
    # Re-import same data
    csv_data = """name,type,latitude,longitude,risk_score,depth_meters
Meenachil Upper Reach,river,9.6800,76.6200,42.5,3.2
"""
    res = client.post(
        "/api/v1/data/import/water-bodies",
        json=csv_data,
    )
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert data["imported_count"] == 0
    assert data["skipped_duplicates_count"] == 1


def test_import_water_bodies_validation_errors(client):
    csv_data = """name,type,latitude,longitude
Invalid Type Site,ocean_trench,9.50,76.50
Bad Coords Site,river,999.0,76.50
Blank Name Site,lake,,
"""
    res = client.post(
        "/api/v1/data/import/water-bodies",
        json=csv_data,
    )
    assert res.status_code == 200
    data = res.json()
    assert len(data["errors"]) >= 3
    assert data["imported_count"] == 0


def test_import_missing_mandatory_columns(client):
    csv_data = """random_col1,random_col2
val1,val2
"""
    res = client.post(
        "/api/v1/data/import/water-bodies",
        json=csv_data,
    )
    assert res.status_code == 400
    assert "missing mandatory columns" in res.json()["detail"].lower()


def test_database_backup_download(client):
    res = client.get("/api/v1/data/backup")
    assert res.status_code == 200
    assert res.headers["content-type"] == "application/x-sqlite3"
    assert "aquora_database_snapshot_" in res.headers["content-disposition"]
    # SQLite file format begins with magic string "SQLite format 3\000"
    content = res.content
    assert len(content) > 1000
    assert content.startswith(b"SQLite format 3\x00")
