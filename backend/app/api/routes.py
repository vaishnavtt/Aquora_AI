"""
AQUORA AI - RESTful API v1 Routes
Endpoints for system health telemetry, water body directory exploration,
hydrodynamic risk prediction inference, and executive dashboard metrics.
"""

from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, Path, HTTPException, status
from sqlalchemy.orm import Session

from backend.app.core.config import settings
from backend.app.db.session import get_db
from backend.app.models.water_body import WaterBodyModel
from backend.app.models.alert import AlertModel
from backend.app.schemas.common import (
    RiskLevelEnum,
    WaterBodyTypeEnum,
    ErrorResponse,
)
from backend.app.schemas.health import HealthResponse
from backend.app.schemas.water_body import WaterBodySchema
from backend.app.schemas.prediction import PredictRequest, PredictResponse
from backend.app.schemas.dashboard import DashboardResponse, DashboardAlertSchema
from backend.app.ml.predictor import PredictionService, get_prediction_service

router = APIRouter()

@router.get(
    "/health",
    response_model=HealthResponse,
    status_code=status.HTTP_200_OK,
    tags=["Health"],
    summary="System Health & Diagnostic Telemetry",
    description="Validates backend operational state, SQLite database connectivity, and ML pipeline readiness."
)
def get_health(
    db: Session = Depends(get_db),
    predictor: PredictionService = Depends(get_prediction_service)
):
    """
    Checks backend connectivity, SQLite status, and ML predictor status.
    """
    db_status = "connected"
    is_healthy = True
    try:
        # Diagnostic lightweight query
        db.query(WaterBodyModel).first()
    except Exception as e:
        db_status = f"error: {str(e)}"
        is_healthy = False

    return HealthResponse(
        status="healthy" if is_healthy else "degraded",
        timestamp=datetime.now(timezone.utc),
        version=settings.VERSION,
        database=db_status,
        ml_model_loaded=predictor.is_trained
    )


@router.get(
    "/water-bodies",
    response_model=List[WaterBodySchema],
    status_code=status.HTTP_200_OK,
    responses={
        422: {"model": ErrorResponse, "description": "Invalid query parameters"}
    },
    tags=["Water Bodies"],
    summary="List Monitored Water Bodies",
    description="Retrieves aquatic monitoring stations with telemetry metrics, filtered optionally by risk level or water body type."
)
def get_water_bodies(
    risk_level: Optional[RiskLevelEnum] = Query(
        None,
        description="Filter by current risk level: low, moderate, high, extreme"
    ),
    type: Optional[WaterBodyTypeEnum] = Query(
        None,
        description="Filter by water body category: lake, river, reservoir, coastal"
    ),
    db: Session = Depends(get_db)
):
    """
    Retrieves all monitored water bodies, optionally filtered by risk level or type.
    """
    query = db.query(WaterBodyModel)
    if risk_level is not None:
        query = query.filter(WaterBodyModel.current_risk_level == risk_level.value)
    if type is not None:
        query = query.filter(WaterBodyModel.type == type.value)

    water_bodies = query.all()
    return water_bodies


@router.get(
    "/water-bodies/{water_body_id}",
    response_model=WaterBodySchema,
    status_code=status.HTTP_200_OK,
    responses={
        status.HTTP_404_NOT_FOUND: {"model": ErrorResponse, "description": "Water body not found"},
        422: {"model": ErrorResponse, "description": "Validation error"}
    },
    tags=["Water Bodies"],
    summary="Get Water Body Details",
    description="Retrieves comprehensive telemetry, risk parameters, and metadata for a specific water body by its integer ID."
)
def get_water_body_by_id(
    water_body_id: int = Path(..., ge=1, description="Unique integer identifier of the water body"),
    db: Session = Depends(get_db)
):
    """
    Retrieves a single monitored water body station by ID.
    """
    water_body = db.query(WaterBodyModel).filter(WaterBodyModel.id == water_body_id).first()
    if not water_body:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Water body with ID {water_body_id} not found."
        )
    return water_body


@router.post(
    "/predict",
    response_model=PredictResponse,
    status_code=status.HTTP_200_OK,
    responses={
        status.HTTP_404_NOT_FOUND: {"model": ErrorResponse, "description": "Referenced water body not found"},
        422: {"model": ErrorResponse, "description": "Telemetry validation failure"}
    },
    tags=["Prediction"],
    summary="Hydrodynamic Risk Evaluation & Inference",
    description="Computes a 0-100 hazard risk score based on hydrodynamic and atmospheric indicators. Dispatches to active predictor engine."
)
def predict_hazard_risk(
    req: PredictRequest,
    db: Session = Depends(get_db),
    predictor: PredictionService = Depends(get_prediction_service)
):
    """
    Computes an aquatic hazard assessment based on environmental telemetry inputs.
    Validates referenced water_body_id if provided.
    """
    # If water_body_id is provided, verify existence in database
    if req.water_body_id is not None:
        wb = db.query(WaterBodyModel).filter(WaterBodyModel.id == req.water_body_id).first()
        if not wb:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Water body with ID {req.water_body_id} not found."
            )

    return predictor.predict(req)


@router.get(
    "/dashboard",
    response_model=DashboardResponse,
    status_code=status.HTTP_200_OK,
    tags=["Dashboard"],
    summary="Executive Dashboard Telemetry & Alerts",
    description="Returns aggregate safety statistics across all monitored sites and the latest active advisory alerts."
)
def get_dashboard(db: Session = Depends(get_db)):
    """
    Returns aggregated metrics and recent safety alerts across monitored water bodies.
    """
    total_sites = db.query(WaterBodyModel).count()
    high_risk_sites = db.query(WaterBodyModel).filter(
        WaterBodyModel.current_risk_level.in_(["high", "extreme"])
    ).count()
    safe_sites = db.query(WaterBodyModel).filter(
        WaterBodyModel.current_risk_level == "low"
    ).count()
    mod_sites = db.query(WaterBodyModel).filter(
        WaterBodyModel.current_risk_level == "moderate"
    ).count()

    recent_alerts = db.query(AlertModel).order_by(AlertModel.timestamp.desc()).limit(10).all()

    return DashboardResponse(
        total_monitored_sites=total_sites,
        high_risk_sites_count=high_risk_sites,
        safe_sites_count=safe_sites,
        moderate_risk_sites_count=mod_sites,
        system_status="operational",
        last_sync=datetime.now(timezone.utc),
        recent_alerts=[DashboardAlertSchema.model_validate(a) for a in recent_alerts]
    )
