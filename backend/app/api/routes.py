from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session

from backend.app.db.session import get_db
from backend.app.models.water_body import WaterBodyModel
from backend.app.models.alert import AlertModel
from backend.app.schemas.health import HealthResponse
from backend.app.schemas.water_body import WaterBodySchema
from backend.app.schemas.prediction import PredictRequest, PredictResponse
from backend.app.schemas.dashboard import DashboardResponse, DashboardAlertSchema
from backend.app.ml.predictor import risk_predictor

router = APIRouter()

@router.get("/health", response_model=HealthResponse, tags=["Health"])
def get_health(db: Session = Depends(get_db)):
    """
    Checks backend connectivity, SQLite status, and ML predictor status.
    """
    db_status = "connected"
    try:
        # Simple test query
        db.query(WaterBodyModel).first()
    except Exception as e:
        db_status = f"error: {str(e)}"

    return HealthResponse(
        status="healthy",
        timestamp=datetime.now(timezone.utc),
        version="1.0.0",
        database=db_status,
        ml_model_loaded=risk_predictor.is_trained
    )


@router.get("/water-bodies", response_model=List[WaterBodySchema], tags=["Water Bodies"])
def get_water_bodies(
    risk_level: Optional[str] = Query(None, description="Filter by risk level (low, moderate, high, extreme)"),
    type: Optional[str] = Query(None, description="Filter by water body type (lake, river, reservoir, coastal)"),
    db: Session = Depends(get_db)
):
    """
    Retrieves all monitored water bodies, optionally filtered by risk level or type.
    """
    query = db.query(WaterBodyModel)
    if risk_level:
        query = query.filter(WaterBodyModel.current_risk_level == risk_level.lower())
    if type:
        query = query.filter(WaterBodyModel.type == type.lower())

    water_bodies = query.all()
    return water_bodies


@router.post("/predict", response_model=PredictResponse, tags=["Prediction"])
def predict_hazard_risk(req: PredictRequest):
    """
    Computes an aquatic hazard assessment based on environmental telemetry inputs.
    Uses an explainable baseline heuristic engine (baseline-heuristic-v0.1) pending
    ML model training.
    """
    return risk_predictor.predict(req)


@router.get("/dashboard", response_model=DashboardResponse, tags=["Dashboard"])
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
