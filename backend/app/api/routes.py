"""
AQUORA AI - RESTful API v1 Routes
Endpoints for system health telemetry, water body directory exploration,
hydrodynamic risk prediction inference, executive dashboard metrics,
river level forecasting, and outbound alert delivery.
"""

from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, Path, HTTPException, status
from sqlalchemy.orm import Session

try:
    from app.core.config import settings
    from app.db.session import get_db
    from app.models.water_body import WaterBodyModel
    from app.models.alert import AlertModel
    from app.schemas.common import (
        RiskLevelEnum,
        WaterBodyTypeEnum,
        ErrorResponse,
    )
    from app.schemas.health import HealthResponse
    from app.schemas.water_body import WaterBodySchema
    from app.schemas.prediction import PredictRequest, PredictResponse
    from app.schemas.dashboard import DashboardResponse, DashboardAlertSchema
    from app.schemas.forecast import WaterLevelForecastRequest, WaterLevelForecastResponse
    from app.schemas.river_data import RiverDataResponse
    from app.schemas.alert import (
        AlertDispatchRequest,
        AlertTestRequest,
        AlertDispatchResponse,
        AlertDeliverySchema,
        AlertChannelStatusResponse,
    )
    from app.ml.predictor import PredictionService, get_prediction_service, risk_predictor
    from app.ml.water_level_forecaster import WaterLevelForecaster
    from app.services.river_data_service import river_data_service
    from app.services.alert_service import alert_service
except ImportError:
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
    from backend.app.schemas.forecast import WaterLevelForecastRequest, WaterLevelForecastResponse
    from backend.app.schemas.river_data import RiverDataResponse
    from backend.app.schemas.alert import (
        AlertDispatchRequest,
        AlertTestRequest,
        AlertDispatchResponse,
        AlertDeliverySchema,
        AlertChannelStatusResponse,
    )
    from backend.app.ml.predictor import PredictionService, get_prediction_service, risk_predictor
    from backend.app.ml.water_level_forecaster import WaterLevelForecaster
    from backend.app.services.river_data_service import river_data_service
    from backend.app.services.alert_service import alert_service

router = APIRouter()

# Instantiate forecasting pipeline singleton
try:
    water_level_forecaster = WaterLevelForecaster()
except Exception:
    water_level_forecaster = None


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


@router.post(
    "/forecast/water-level",
    response_model=WaterLevelForecastResponse,
    tags=["Forecasting"],
    summary="Forecast River Water Level",
    description="Experimental one-hour-ahead river water level forecasting for calibrated monitoring stations."
)
def forecast_river_water_level(req: WaterLevelForecastRequest):
    """
    Experimental one-hour-ahead river water level forecasting for RAMAMANGALAM BRIDGE.
    Requires at least 13 consecutive hourly telemetry readings in chronological order.
    Notice: This is an experimental river stage forecast for prototype research,
    NOT a validated drowning-risk prediction or public flood warning.
    """
    if req.station_name.strip().upper() != "RAMAMANGALAM BRIDGE":
        raise HTTPException(
            status_code=400,
            detail=f"Water-level forecasting is currently calibrated exclusively for 'RAMAMANGALAM BRIDGE'; received '{req.station_name}'."
        )

    if water_level_forecaster is None or not water_level_forecaster.is_loaded:
        raise HTTPException(
            status_code=503,
            detail="Water level forecasting model artifact is not loaded on this server."
        )

    try:
        raw_readings = [
            {"timestamp": r.timestamp, "water_level_m": r.water_level_m}
            for r in req.readings
        ]
        result = water_level_forecaster.predict_from_timestamped_readings(raw_readings)
        return WaterLevelForecastResponse(**result)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Forecasting error: {str(e)}")


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


@router.get("/river-data/{station_name}", response_model=RiverDataResponse, tags=["River Telemetry"])
def get_river_data(
    station_name: str,
    mode: Optional[str] = Query("auto", description="Data retrieval mode: 'auto', 'live', or 'historical'")
):
    """
    Returns the latest river water-level telemetry observation for a station.
    Accurately indicates whether data is LIVE, CACHED, HISTORICAL, or UNAVAILABLE,
    and provides verified historical reference data without fabricating live streams.
    """
    return river_data_service.get_river_data(station_name, mode=mode)


@router.post("/alerts/dispatch", response_model=AlertDispatchResponse, tags=["Alerts"])
def dispatch_alert(req: AlertDispatchRequest, db: Session = Depends(get_db)):
    """
    Dispatches an outbound emergency water safety alert via a real external delivery channel
    (Webhook/HTTP Gateway or SMTP Email).
    Features:
    - Safe test mode execution (set test_mode=True to validate and simulate without external network side-effects).
    - Upstream provider confirmation: strictly does NOT claim delivery unless confirmed by the upstream service.
    - Persistent delivery audit logging into database.
    """
    return alert_service.dispatch_alert(req, db)


@router.post("/alerts/test", response_model=AlertDispatchResponse, tags=["Alerts"])
def send_test_alert(req: AlertTestRequest, db: Session = Depends(get_db)):
    """
    Dispatches an explicitly authorized test notification.
    Includes safe test mode simulation by default.
    Clearly identifies messages with test prefixes to prevent accidental alarm.
    """
    return alert_service.dispatch_test_notification(req, db)


@router.get("/alerts/deliveries", response_model=List[AlertDeliverySchema], tags=["Alerts"])
def get_alert_deliveries(
    limit: int = Query(20, ge=1, le=100, description="Max delivery records to retrieve"),
    db: Session = Depends(get_db)
):
    """
    Returns recent outbound alert delivery audit logs and their upstream provider confirmation statuses.
    """
    records = alert_service.get_recent_deliveries(db, limit=limit)
    return [AlertDeliverySchema.model_validate(r) for r in records]


@router.get("/alerts/status", response_model=AlertChannelStatusResponse, tags=["Alerts"])
def get_alert_channel_status():
    """
    Returns the configuration and readiness status of outbound alert channels.
    """
    return alert_service.get_channel_status()
