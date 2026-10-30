"""
AQUORA AI - Administration, System Diagnostics & Audit Log Routes
Track: Administration, Health Monitoring & Role Governance

Endpoints:
- GET   /api/v1/admin/diagnostics       : Complete system diagnostics (DB, ML models, memory, background schedulers)
- GET   /api/v1/admin/users             : Personnel user management directory
- PATCH /api/v1/admin/users/{user_id}   : Modify user status (activate / deactivate / change role)
- GET   /api/v1/admin/logs              : In-memory live operational log viewer
"""

import os
import sys
import time
from collections import deque
from datetime import datetime, timezone
import logging
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Path, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.orm import Session

try:
    from app.core.config import settings
    from app.db.session import get_db
    from app.models.user import UserModel
    from app.models.water_body import WaterBodyModel
    from app.models.inspection import InspectionRecordModel
    from app.models.alert import AlertModel
    from app.models.alert_delivery import AlertDeliveryModel
    from app.schemas.auth import UserResponse, UserRole
    from app.services.hazard_monitoring_service import hazard_monitoring_service
    from app.services.drowning_risk_service import drowning_risk_service
except ImportError:
    from backend.app.core.config import settings
    from backend.app.db.session import get_db
    from backend.app.models.user import UserModel
    from backend.app.models.water_body import WaterBodyModel
    from backend.app.models.inspection import InspectionRecordModel
    from backend.app.models.alert import AlertModel
    from backend.app.models.alert_delivery import AlertDeliveryModel
    from backend.app.schemas.auth import UserResponse, UserRole
    from backend.app.services.hazard_monitoring_service import hazard_monitoring_service
    from backend.app.services.drowning_risk_service import drowning_risk_service

# Startup time tracking for uptime calculation
STARTUP_TIME = time.time()

# In-memory circular log buffer
_LOG_BUFFER: deque = deque(maxlen=200)


class LogBufferHandler(logging.Handler):
    """Custom logging handler appending formatted log records to the in-memory ring buffer."""
    def emit(self, record):
        try:
            entry = {
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "level": record.levelname,
                "logger": record.name,
                "message": record.getMessage(),
            }
            _LOG_BUFFER.append(entry)
        except Exception:
            pass


# Attach handler to root logger
_handler = LogBufferHandler()
_handler.setLevel(logging.INFO)
logging.getLogger().addHandler(_handler)

# Seed initial operational log entry
_LOG_BUFFER.append({
    "timestamp": datetime.now(timezone.utc).isoformat(),
    "level": "INFO",
    "logger": "aquora.admin",
    "message": "AQUORA AI System Administration & Diagnostic subsystem initialized.",
})

router = APIRouter(prefix="/admin", tags=["System Administration & Diagnostics"])


class UserStatusUpdateRequest(BaseModel):
    is_active: Optional[bool] = Field(None, description="Active status toggle")
    role: Optional[UserRole] = Field(None, description="Updated role designation")


@router.get(
    "/diagnostics",
    status_code=status.HTTP_200_OK,
    summary="Comprehensive System Health & Infrastructure Diagnostics",
    description="Inspects SQLite database metrics, ML model status, background monitoring schedulers, and process telemetry.",
)
def get_system_diagnostics(db: Session = Depends(get_db)):
    uptime_sec = round(time.time() - STARTUP_TIME, 1)

    # SQLite DB inspection
    db_path = settings.DATABASE_URL.replace("sqlite:///", "")
    if not os.path.isabs(db_path):
        backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
        db_path = os.path.join(backend_dir, db_path)
    
    db_size_bytes = os.path.getsize(db_path) if os.path.exists(db_path) else 0

    table_counts = {
        "users": db.query(UserModel).count(),
        "water_bodies": db.query(WaterBodyModel).count(),
        "inspections": db.query(InspectionRecordModel).count(),
        "alerts": db.query(AlertModel).count(),
        "alert_deliveries": db.query(AlertDeliveryModel).count(),
    }

    # Background scheduler
    sched_status = hazard_monitoring_service.get_status()

    # ML model diagnostics
    ml_status = drowning_risk_service.get_model_status()

    return {
        "system_status": "OPERATIONAL",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "version": settings.VERSION,
        "runtime": {
            "python_version": sys.version.split()[0],
            "platform": sys.platform,
            "uptime_seconds": uptime_sec,
            "uptime_formatted": f"{int(uptime_sec // 3600)}h {int((uptime_sec % 3600) // 60)}m {int(uptime_sec % 60)}s",
        },
        "database": {
            "type": "SQLite3",
            "file_path": db_path,
            "size_bytes": db_size_bytes,
            "size_formatted": f"{db_size_bytes / (1024 * 1024):.2f} MB",
            "table_record_counts": table_counts,
        },
        "machine_learning": {
            "forecaster_stations": ["RAMAMANGALAM BRIDGE", "PALA", "TRINAYAKUDAM"],
            "hazard_classifier_trained": bool(ml_status.champion_model_name),
            "dataset_audit_count": len(ml_status.datasets_audit),
        },
        "background_monitoring": {
            "scheduler_active": sched_status.is_scheduler_running,
            "polling_interval_seconds": sched_status.monitoring_interval_seconds,
            "safe_simulation_mode": sched_status.safe_simulation_enforced,
        },
        "alert_dispatch_mode": {
            "test_mode_enforced": settings.ALERT_TEST_MODE,
            "webhook_configured": bool(settings.ALERT_WEBHOOK_URL and not settings.ALERT_WEBHOOK_URL.startswith("your_")),
            "smtp_configured": bool(settings.SMTP_HOST and not settings.SMTP_HOST.startswith("smtp.example")),
            "sms_configured": bool(settings.TWILIO_ACCOUNT_SID and not settings.TWILIO_ACCOUNT_SID.startswith("your_")),
        },
    }


@router.get(
    "/users",
    response_model=List[UserResponse],
    status_code=status.HTTP_200_OK,
    summary="List Personnel Accounts (Admin Directory)",
    description="Retrieves all registered personnel accounts with activity audits and active role assignments.",
)
def list_admin_users(
    role: Optional[str] = Query(None, description="Filter by role"),
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    db: Session = Depends(get_db),
):
    query = db.query(UserModel)
    if role:
        query = query.filter(UserModel.role == role.upper())
    if is_active is not None:
        query = query.filter(UserModel.is_active == is_active)
    
    users = query.order_by(UserModel.id).all()
    return [UserResponse.model_validate(u) for u in users]


@router.patch(
    "/users/{user_id}",
    response_model=UserResponse,
    status_code=status.HTTP_200_OK,
    summary="Update User Account Status & Role",
    description="Enables or disables personnel access or updates departmental role permissions.",
)
def update_user_status(
    req: UserStatusUpdateRequest,
    user_id: int = Path(..., ge=1, description="Target user ID"),
    db: Session = Depends(get_db),
):
    user = db.query(UserModel).filter(UserModel.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User #{user_id} not found.",
        )

    if req.is_active is not None:
        user.is_active = req.is_active
    if req.role is not None:
        user.role = req.role.value if hasattr(req.role, "value") else str(req.role)

    db.commit()
    db.refresh(user)

    _LOG_BUFFER.append({
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "level": "INFO",
        "logger": "aquora.admin",
        "message": f"User account #{user.id} ({user.username}) updated: active={user.is_active}, role={user.role}",
    })

    return UserResponse.model_validate(user)


@router.get(
    "/logs",
    status_code=status.HTTP_200_OK,
    summary="Live In-Memory Operational Logs",
    description="Retrieves the most recent system operational activity logs from the memory ring buffer.",
)
def get_operational_logs(limit: int = Query(50, ge=1, le=200)):
    logs_list = list(_LOG_BUFFER)
    logs_list.reverse()
    return {
        "total_buffered": len(logs_list),
        "logs": logs_list[:limit],
    }
