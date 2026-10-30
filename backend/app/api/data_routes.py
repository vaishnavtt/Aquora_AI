"""
AQUORA AI - Data Management, Export, Import & Disaster Recovery Routes
Track: Data Management, Quality Assurance & Audit Trails

Endpoints:
- GET  /api/v1/data/export/water-bodies : Download monitored water bodies in CSV format
- GET  /api/v1/data/export/inspections  : Download safety inspection ledgers in CSV format
- POST /api/v1/data/import/water-bodies : Ingest verified water bodies from CSV with duplicate rejection
- GET  /api/v1/data/backup             : Export atomic SQLite database snapshot
"""

import json
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Request, Response, UploadFile, File, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
import io

try:
    from app.db.session import get_db
    from app.services.data_management_service import data_management_service
    from app.api.auth_routes import get_optional_current_user, require_roles
    from app.models.user import UserModel
except ImportError:
    from backend.app.db.session import get_db
    from backend.app.services.data_management_service import data_management_service
    from backend.app.api.auth_routes import get_optional_current_user, require_roles
    from backend.app.models.user import UserModel

router = APIRouter(prefix="/data", tags=["Data Management & Disaster Recovery"])


@router.get(
    "/export/water-bodies",
    summary="Export Monitored Water Bodies (CSV)",
    description="Generates an RFC 4180 compliant CSV export containing all registered aquatic monitoring sites.",
)
def export_water_bodies_csv(db: Session = Depends(get_db)):
    csv_data = data_management_service.export_water_bodies_csv(db)
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    filename = f"aquora_water_bodies_{timestamp}.csv"

    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename={filename}",
            "Cache-Control": "no-cache",
        },
    )


@router.get(
    "/export/inspections",
    summary="Export Safety Inspection Ledger (CSV)",
    description="Generates an RFC 4180 compliant CSV export of all safety audits and field remediations.",
)
def export_inspections_csv(db: Session = Depends(get_db)):
    csv_data = data_management_service.export_inspections_csv(db)
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    filename = f"aquora_inspections_{timestamp}.csv"

    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename={filename}",
            "Cache-Control": "no-cache",
        },
    )


@router.post(
    "/import/water-bodies",
    status_code=status.HTTP_200_OK,
    summary="Import Water Bodies Dataset (CSV)",
    description="Uploads a CSV file of water bodies with duplicate detection and Kerala coordinate boundary verification.",
)
async def import_water_bodies(
    request: Request,
    file: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
):
    """
    Accepts CSV content either via multipart file upload, JSON payload, or raw text body.
    """
    csv_string = None

    if file:
        content_bytes = await file.read()
        csv_string = content_bytes.decode("utf-8", errors="replace")
    else:
        # Check raw body
        body_bytes = await request.body()
        if body_bytes:
            body_str = body_bytes.decode("utf-8", errors="replace").strip()
            # If body is JSON encoded
            if body_str.startswith("{"):
                try:
                    payload = json.loads(body_str)
                    csv_string = payload.get("csv_text") or payload.get("data")
                except Exception:
                    pass
            elif body_str.startswith('"') and body_str.endswith('"'):
                # JSON string literal
                try:
                    csv_string = json.loads(body_str)
                except Exception:
                    csv_string = body_str.strip('"')
            else:
                csv_string = body_str

    if not csv_string or not csv_string.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="CSV content must be supplied either as a file upload ('file') or in the request body ('csv_text').",
        )

    result = data_management_service.import_water_bodies_csv(db, csv_string)
    if not result.get("success", False):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=result.get("error"))

    return result


@router.get(
    "/backup",
    summary="Download Database Snapshot Backup",
    description="Downloads an atomic snapshot of the SQLite database for disaster recovery and operational continuity.",
)
def get_database_backup():
    try:
        backup_bytes = data_management_service.get_database_backup_bytes()
    except FileNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    filename = f"aquora_database_snapshot_{timestamp}.db"

    return StreamingResponse(
        io.BytesIO(backup_bytes),
        media_type="application/x-sqlite3",
        headers={
            "Content-Disposition": f"attachment; filename={filename}",
            "Content-Length": str(len(backup_bytes)),
        },
    )
