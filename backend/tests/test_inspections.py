"""
Pytest suite for AQUORA AI Authority Inspection Prioritization & Persistence.
Verifies:
1. Risk-informed inspection triage calculations and methodology transparency.
2. Database persistence of official inspection records and findings.
3. Multi-dimensional filtering (status, water_body_id, priority_tier, action_required).
4. Status lifecycle transitions (SCHEDULED -> IN_PROGRESS -> COMPLETED).
5. Truthful historical trends (insufficient history detection when < 5 records).
"""

import pytest
from datetime import datetime, timezone
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.water_body import WaterBodyModel
from app.models.inspection import InspectionRecordModel


def test_inspection_prioritization_endpoint(client: TestClient):
    """Verifies that the algorithmic inspection triage returns ranked sites with honest metadata."""
    response = client.get("/api/v1/authority/inspection-prioritization")
    assert response.status_code == 200
    data = response.json()

    assert data["total_sites_evaluated"] > 0
    assert len(data["prioritized_sites"]) == data["total_sites_evaluated"]
    assert "priority_scoring_methodology" in data
    assert "disclaimer" in data

    # Verify descending sort order by priority rank score
    scores = [site["priority_rank_score"] for site in data["prioritized_sites"]]
    assert scores == sorted(scores, reverse=True)

    # Quarries must receive elevated priority
    quarry_sites = [s for s in data["prioritized_sites"] if s["water_body_type"] == "quarry"]
    for q in quarry_sites:
        assert q["priority_rank_score"] >= 70.0
        assert q["inspection_priority"] in ("CRITICAL", "HIGH")


def test_create_and_get_inspection(client: TestClient, db_session: Session):
    """Verifies creating an inspection record and retrieving it by ID."""
    site = db_session.query(WaterBodyModel).first()
    assert site is not None

    payload = {
        "water_body_id": site.id,
        "inspector_name": "Senior Inspector K. Nair",
        "findings_notes": "Initial pre-monsoon safety audit assignment.",
        "suggested_focus": ["Check perimeter fence", "Verify warning signs"]
    }

    create_res = client.post("/api/v1/authority/inspections", json=payload)
    assert create_res.status_code == 201
    created = create_res.json()

    assert created["water_body_id"] == site.id
    assert created["water_body_name"] == site.name
    assert created["status"] == "SCHEDULED"
    assert created["inspector_name"] == "Senior Inspector K. Nair"
    assert created["findings_notes"] == "Initial pre-monsoon safety audit assignment."
    assert "Check perimeter fence" in created["suggested_focus"]
    assert created["priority_rank_score"] > 0.0

    inspection_id = created["id"]
    get_res = client.get(f"/api/v1/authority/inspections/{inspection_id}")
    assert get_res.status_code == 200
    fetched = get_res.json()
    assert fetched["id"] == inspection_id
    assert fetched["water_body_name"] == site.name


def test_create_inspection_water_body_not_found(client: TestClient):
    """Verifies that creating an inspection for a nonexistent water body returns 404."""
    payload = {
        "water_body_id": 999999,
        "inspector_name": "Ghost Inspector",
        "findings_notes": "Invalid site assignment."
    }
    res = client.post("/api/v1/authority/inspections", json=payload)
    assert res.status_code == 404


def test_update_inspection_status_and_lifecycle(client: TestClient, db_session: Session):
    """Verifies transitioning an inspection through SCHEDULED -> IN_PROGRESS -> COMPLETED."""
    site = db_session.query(WaterBodyModel).first()
    record = InspectionRecordModel(
        water_body_id=site.id,
        water_body_name=site.name,
        water_body_type=site.type,
        district="Kerala",
        priority_tier="HIGH",
        priority_rank_score=72.0,
        status="SCHEDULED",
        inspector_name="Unit 4 Officer",
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    db_session.add(record)
    db_session.commit()
    db_session.refresh(record)

    # 1. Transition to IN_PROGRESS
    patch_res = client.patch(
        f"/api/v1/authority/inspections/{record.id}",
        json={"status": "IN_PROGRESS", "findings_notes": "Field team arrived on site."}
    )
    assert patch_res.status_code == 200
    assert patch_res.json()["status"] == "IN_PROGRESS"
    assert patch_res.json()["findings_notes"] == "Field team arrived on site."

    # 2. Complete inspection with verified safety checklist and remediation flag
    complete_res = client.patch(
        f"/api/v1/authority/inspections/{record.id}",
        json={
            "status": "COMPLETED",
            "findings_notes": "Signboard damaged by monsoon debris. Re-installation requested.",
            "safety_measures_verified": ["Warning sign missing", "Access gate unlocked"],
            "action_required": True
        }
    )
    assert complete_res.status_code == 200
    data = complete_res.json()
    assert data["status"] == "COMPLETED"
    assert data["action_required"] is True
    assert data["completed_date"] is not None
    assert "Warning sign missing" in data["safety_measures_verified"]


def test_list_inspections_filtering(client: TestClient, db_session: Session):
    """Verifies multi-dimensional query filtering for the inspection queue."""
    site = db_session.query(WaterBodyModel).first()
    now = datetime.now(timezone.utc)

    # Seed 3 distinct records
    r1 = InspectionRecordModel(
        water_body_id=site.id,
        water_body_name=site.name,
        water_body_type=site.type,
        district="Ernakulam",
        priority_tier="CRITICAL",
        priority_rank_score=85.0,
        status="SCHEDULED",
        action_required=True,
        created_at=now,
        updated_at=now,
    )
    r2 = InspectionRecordModel(
        water_body_id=site.id,
        water_body_name=site.name,
        water_body_type=site.type,
        district="Ernakulam",
        priority_tier="ROUTINE",
        priority_rank_score=25.0,
        status="COMPLETED",
        action_required=False,
        completed_date=now,
        created_at=now,
        updated_at=now,
    )
    db_session.add_all([r1, r2])
    db_session.commit()

    # Filter by status SCHEDULED
    res_sched = client.get("/api/v1/authority/inspections?status=SCHEDULED")
    assert res_sched.status_code == 200
    data_sched = res_sched.json()
    assert all(i["status"] == "SCHEDULED" for i in data_sched["inspections"])

    # Filter by action_required
    res_action = client.get("/api/v1/authority/inspections?action_required=true")
    assert res_action.status_code == 200
    data_action = res_action.json()
    assert all(i["action_required"] is True for i in data_action["inspections"])


def test_inspection_trends_insufficient_and_sufficient_history(client: TestClient, db_session: Session):
    """Verifies that trends are strictly suppressed until at least 5 records exist."""
    # Clean table
    db_session.query(InspectionRecordModel).delete()
    db_session.commit()

    # 1. Under minimum threshold (< 5 records)
    res_empty = client.get("/api/v1/authority/inspections/trends/summary")
    assert res_empty.status_code == 200
    empty_data = res_empty.json()
    assert empty_data["has_sufficient_history"] is False
    assert len(empty_data["trends"]) == 0
    assert "Insufficient historical inspection data" in empty_data["summary"]

    # 2. Add 5 records to meet statistical validity threshold
    site = db_session.query(WaterBodyModel).first()
    now = datetime.now(timezone.utc)
    records = [
        InspectionRecordModel(
            water_body_id=site.id,
            water_body_name=site.name,
            water_body_type=site.type,
            district="Kerala",
            priority_tier="HIGH",
            priority_rank_score=65.0,
            status="COMPLETED",
            action_required=(i % 2 == 0),
            completed_date=now,
            created_at=now,
            updated_at=now,
        )
        for i in range(5)
    ]
    db_session.add_all(records)
    db_session.commit()

    res_trends = client.get("/api/v1/authority/inspections/trends/summary")
    assert res_trends.status_code == 200
    trend_data = res_trends.json()
    assert trend_data["has_sufficient_history"] is True
    assert trend_data["total_records"] >= 5
    assert len(trend_data["trends"]) > 0
    assert trend_data["trends"][0]["total_inspections"] >= 5
