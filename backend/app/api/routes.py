import os
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.water_body import WaterBodyModel
from app.models.alert import AlertModel
from app.schemas.health import HealthResponse
from app.schemas.water_body import WaterBodySchema
from app.schemas.prediction import PredictRequest, PredictResponse
from app.schemas.dashboard import DashboardResponse, DashboardAlertSchema, StationAvailabilitySchema
from app.schemas.forecast import WaterLevelForecastRequest, WaterLevelForecastResponse
from app.schemas.river_data import (
    RiverDataResponse,
    HistoricalSeriesResponse,
    ForecastVsObservationResponse,
)
from app.schemas.environmental import DimensionAudit, EnvironmentalPipelineAuditResponse
from app.schemas.monitoring import (
    HazardEvaluationResult,
    HazardMonitoringEvaluationRequest,
    HazardMonitoringStatusResponse,
)
from app.schemas.alert import (
    AlertDispatchRequest,
    AlertTestRequest,
    AlertDispatchResponse,
    AlertDeliverySchema,
    AlertChannelStatusResponse,
)
from app.ml.predictor import risk_predictor
from app.ml.water_level_forecaster import WaterLevelForecaster
from app.services.river_data_service import river_data_service
from app.services.alert_service import alert_service
from app.services.hazard_monitoring_service import hazard_monitoring_service

router = APIRouter()

# Instantiate forecasting pipeline singleton
try:
    water_level_forecaster = WaterLevelForecaster()
except Exception:
    water_level_forecaster = None

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


@router.get("/water-bodies/by-coordinates", response_model=WaterBodySchema, tags=["Water Bodies"])
def get_water_body_by_coordinates(
    latitude: float = Query(..., description="Latitude coordinate"),
    longitude: float = Query(..., description="Longitude coordinate"),
    tolerance_deg: float = Query(0.08, description="Coordinate match radius tolerance in degrees (~8.8km)"),
    db: Session = Depends(get_db)
):
    """
    Retrieves the monitored water body nearest to the specified coordinates within tolerance.
    If no water body is located within tolerance, returns an explicit 404 error.
    AQUORA AI strictly does NOT assign fabricated environmental observations or risk assessments
    to unsupported locations.
    """
    water_bodies = db.query(WaterBodyModel).all()
    best_wb = None
    min_dist = float("inf")
    for wb in water_bodies:
        dist = ((wb.latitude - latitude) ** 2 + (wb.longitude - longitude) ** 2) ** 0.5
        if dist < min_dist:
            min_dist = dist
            best_wb = wb

    if best_wb is not None and min_dist <= tolerance_deg:
        return best_wb

    raise HTTPException(
        status_code=404,
        detail=(
            f"No monitored water body found near coordinates ({latitude:.5f}, {longitude:.5f}) within tolerance. "
            f"AQUORA AI does not assign fabricated environmental observations or risk assessments to unsupported locations."
        )
    )


@router.get("/water-bodies/{water_body_id}", response_model=WaterBodySchema, tags=["Water Bodies"])
def get_water_body_by_id(water_body_id: int, db: Session = Depends(get_db)):
    """
    Retrieves a single monitored water body record by its database ID.
    Returns 404 with an explicit data-availability message if the location is unknown.
    """
    wb = db.query(WaterBodyModel).filter(WaterBodyModel.id == water_body_id).first()
    if not wb:
        raise HTTPException(
            status_code=404,
            detail=(
                f"Water body #{water_body_id} not found in monitored database. "
                f"Unsupported locations receive an explicit data-availability message without fabricated data."
            )
        )
    return wb


@router.get("/environmental-data/{water_body_id}", response_model=EnvironmentalPipelineAuditResponse, tags=["Environmental Pipeline"])
def get_environmental_pipeline_audit(water_body_id: int, db: Session = Depends(get_db)):
    """
    Audits the availability, origin, and latency across the 6 core environmental dimensions
    for the selected water body. Explicitly marks unavailable data without fabrication.
    """
    wb = db.query(WaterBodyModel).filter(WaterBodyModel.id == water_body_id).first()
    if not wb:
        raise HTTPException(
            status_code=404,
            detail=f"Water body #{water_body_id} not found in monitored database."
        )

    is_usgs = "USGS" in wb.name.upper() or "STANFORD" in wb.name.upper() or "FRANCISQUITO" in wb.name.upper()
    is_ramamangalam = "RAMAMANGALAM" in wb.name.upper()

    dimensions = {}

    # 1. Rainfall: Verified real-time raingauge telemetry stream
    dimensions["rainfall"] = DimensionAudit(
        dimension="rainfall",
        status="UNAVAILABLE",
        value=None,
        units="mm",
        source="None",
        observation_timestamp=None,
        limitation_reason="No real-time raingauge telemetry stream connected. Dedicated IMD / AWS sensor integration required."
    )

    # 2. Water Level & recent changes
    if is_usgs:
        river_res = river_data_service.get_river_data("11164500", mode="live")
        dimensions["water_level"] = DimensionAudit(
            dimension="water_level",
            status="AVAILABLE_LIVE" if river_res.is_live else "UNAVAILABLE",
            value=river_res.water_level_m,
            units="m",
            source=river_res.data_source,
            observation_timestamp=river_res.observation_timestamp,
            limitation_reason=None if river_res.is_live else "USGS live service temporarily unreachable"
        )
        dimensions["flow_rate"] = DimensionAudit(
            dimension="flow_rate",
            status="AVAILABLE_LIVE" if river_res.is_live else "UNAVAILABLE",
            value=river_res.flow_rate_cms,
            units="m³/s",
            source=river_res.data_source,
            observation_timestamp=river_res.observation_timestamp,
            limitation_reason=None if river_res.is_live else "USGS live streamflow unavailable"
        )
    elif is_ramamangalam:
        river_res = river_data_service.get_river_data("RAMAMANGALAM BRIDGE", mode="auto")
        if river_res.is_live:
            wl_status = "AVAILABLE_LIVE"
            wl_val = river_res.water_level_m
            wl_time = river_res.observation_timestamp
            wl_reason = None
        else:
            wl_status = "AVAILABLE_HISTORICAL"
            wl_val = 2.162
            wl_time = "2025-03-10T08:30:00+05:30"
            wl_reason = "Live NWIC API key not configured; verified historical Kerala SW archive telemetry active."
        dimensions["water_level"] = DimensionAudit(
            dimension="water_level",
            status=wl_status,
            value=wl_val,
            units="m",
            source="Kerala State Water Resources Department (Kerala SW)",
            observation_timestamp=wl_time,
            limitation_reason=wl_reason
        )
        dimensions["flow_rate"] = DimensionAudit(
            dimension="flow_rate",
            status="UNAVAILABLE",
            value=None,
            units="m³/s",
            source="None",
            observation_timestamp=None,
            limitation_reason="No discharge rating curve or flow telemetry sensor installed at this stage gauge."
        )
    else:
        dimensions["water_level"] = DimensionAudit(
            dimension="water_level",
            status="AVAILABLE_STATIC",
            value=wb.depth_meters,
            units="m",
            source=wb.data_source or "Hydrological Database Baseline",
            observation_timestamp=wb.last_updated.isoformat() if wb.last_updated else None,
            limitation_reason="Static reference stage reading from baseline site survey."
        )
        dimensions["flow_rate"] = DimensionAudit(
            dimension="flow_rate",
            status="AVAILABLE_STATIC" if wb.flow_rate_cms is not None else "UNAVAILABLE",
            value=wb.flow_rate_cms,
            units="m³/s",
            source=wb.data_source or "Hydrological Database Baseline",
            observation_timestamp=wb.last_updated.isoformat() if wb.last_updated else None,
            limitation_reason=None if wb.flow_rate_cms is not None else "No flow sensor at this site"
        )

    # 3. Water-body type
    dimensions["water_body_type"] = DimensionAudit(
        dimension="water_body_type",
        status="AVAILABLE_STATIC",
        value=wb.type,
        units="classification",
        source="AQUORA Monitored Hydrology DB",
        observation_timestamp=wb.last_updated.isoformat() if wb.last_updated else None,
        limitation_reason=None
    )

    # 4. Terrain & Elevation
    dimensions["terrain_elevation"] = DimensionAudit(
        dimension="terrain_elevation",
        status="AVAILABLE_STATIC" if wb.elevation_meters is not None else "UNAVAILABLE",
        value=wb.elevation_meters,
        units="m MSL",
        source="SRTM Digital Elevation Model / Kerala Water Resources GIS",
        observation_timestamp=None,
        limitation_reason=None if wb.elevation_meters is not None else "Elevation not surveyed for this coordinates"
    )

    # 5. Historical Hazard / Drowning Incidents
    dimensions["historical_incidents"] = DimensionAudit(
        dimension="historical_incidents",
        status="UNAVAILABLE",
        value=None,
        units="incident_count",
        source="None",
        observation_timestamp=None,
        limitation_reason="No validated public Kerala drowning incident registry is accessible. Drowning incident records are strictly not fabricated."
    )

    # 6. Observation Timestamps & Source Metadata
    dimensions["source_metadata"] = DimensionAudit(
        dimension="source_metadata",
        status="AVAILABLE_STATIC",
        value=wb.data_source or "AQUORA Hydro Registry",
        units="metadata",
        source=wb.data_source or "AQUORA Hydro Registry",
        observation_timestamp=wb.last_updated.isoformat() if wb.last_updated else None,
        limitation_reason=None
    )

    avail_count = sum(1 for d in dimensions.values() if d.status != "UNAVAILABLE")
    unavail_count = sum(1 for d in dimensions.values() if d.status == "UNAVAILABLE")

    return EnvironmentalPipelineAuditResponse(
        station_id=wb.id,
        station_name=wb.name,
        water_body_type=wb.type,
        basin_region=wb.basin_region,
        latitude=wb.latitude,
        longitude=wb.longitude,
        audit_timestamp=datetime.now(timezone.utc),
        data_freshness="Audited pipeline status",
        dimensions=dimensions,
        available_dimensions_count=avail_count,
        unavailable_dimensions_count=unavail_count,
        ethical_data_notice="AQUORA AI strictly adheres to data transparency: missing variables (rainfall telemetry, drowning incident history) are explicitly reported as UNAVAILABLE and never synthesized."
    )



@router.post("/predict", response_model=PredictResponse, tags=["Prediction"])
def predict_hazard_risk(req: PredictRequest):
    """
    Computes an aquatic hazard assessment based on environmental telemetry inputs.
    Uses an explainable baseline heuristic engine (baseline-heuristic-v0.1) pending
    ML model training.
    """
    return risk_predictor.predict(req)


@router.post("/forecast/water-level", response_model=WaterLevelForecastResponse, tags=["Forecasting"])
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

    station_availability = [
        StationAvailabilitySchema(
            station_name="USGS Station 11164500 (San Francisquito Creek)",
            station_type="Instantaneous River Stage Stream",
            telemetry_status="LIVE",
            data_source="U.S. Geological Survey (USGS) NWIS",
            freshness="Real-time (Waterservices API)",
            is_live=True
        ),
        StationAvailabilitySchema(
            station_name="RAMAMANGALAM BRIDGE (Muvattupuzha River)",
            station_type="Hourly Stage Hydrology Gauge",
            telemetry_status="LIVE" if os.getenv("NWIC_API_KEY") else "HISTORICAL_ARCHIVE",
            data_source="Kerala State Water Resources Department (Kerala SW)",
            freshness="Verified Historical Archive (2021-2025 Active)",
            is_live=bool(os.getenv("NWIC_API_KEY"))
        ),
        StationAvailabilitySchema(
            station_name="Ashtamudi Lake",
            station_type="Estuarine Coastal Lake Baseline",
            telemetry_status="STATIC",
            data_source="AQUORA Kerala Hydrology DB",
            freshness="Baseline Site Survey",
            is_live=False
        ),
        StationAvailabilitySchema(
            station_name="Vembanad Lake",
            station_type="Ramsar Wetland Baseline",
            telemetry_status="STATIC",
            data_source="AQUORA Kerala Hydrology DB",
            freshness="Baseline Site Survey",
            is_live=False
        ),
        StationAvailabilitySchema(
            station_name="Idukki Reservoir",
            station_type="Hydroelectric Storage Reservoir Baseline",
            telemetry_status="STATIC",
            data_source="AQUORA Kerala Hydrology DB",
            freshness="Baseline Site Survey",
            is_live=False
        ),
    ]

    return DashboardResponse(
        total_monitored_sites=total_sites,
        high_risk_sites_count=high_risk_sites,
        safe_sites_count=safe_sites,
        moderate_risk_sites_count=mod_sites,
        system_status="operational",
        last_sync=datetime.now(timezone.utc),
        recent_alerts=[DashboardAlertSchema.model_validate(a) for a in recent_alerts],
        station_availability=station_availability
    )


@router.get("/river-data/history/{station_name}", response_model=HistoricalSeriesResponse, tags=["River Telemetry"])
def get_river_history(
    station_name: str,
    limit: int = Query(48, ge=1, le=200, description="Number of historical observation records to return")
):
    """
    Returns verified historical river stage telemetry series.
    Calibrated for RAMAMANGALAM BRIDGE (Kerala SW 2021-2025 archive) and USGS instantaneous telemetry.
    Unsupported stations return an explicit UNAVAILABLE status without synthesized readings.
    """
    return river_data_service.get_historical_series(station_name, limit=limit)


@router.get("/river-data/forecast-vs-observation/{station_name}", response_model=ForecastVsObservationResponse, tags=["River Telemetry"])
def get_forecast_vs_observation(
    station_name: str,
    sample_size: int = Query(24, ge=5, le=100, description="Number of sequential evaluation points to compare")
):
    """
    Returns authentic forecast-versus-observation comparison points.
    Evaluates the trained Ridge residual delta ML model against ground-truth actual observations
    at t+1 hour from the Kerala SW historical test dataset.
    """
    return river_data_service.get_forecast_vs_observation(station_name, sample_size=sample_size)


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


# ==========================================
# Automated Hazard Monitoring Endpoints
# ==========================================

@router.post("/monitoring/evaluate", response_model=List[HazardEvaluationResult], tags=["Hazard Monitoring"])
def evaluate_hazard_monitoring(
    req: HazardMonitoringEvaluationRequest,
    db: Session = Depends(get_db)
):
    """
    Executes an automated hazard evaluation sweep across monitored telemetry stations.
    - Evaluates stage surges (delta_h >= 0.15m), flow breaches (>= 6.0 m³/s), and risk score thresholds.
    - Recalculates risk when newly available observations exist.
    - Avoids duplicate alert generation.
    - Enforces safe simulation by default (test_mode=True) to prevent unsolicited real alerts.
    """
    if req.station_query:
        result = hazard_monitoring_service.evaluate_station(
            req.station_query,
            db=db,
            safe_simulation=req.safe_simulation_only
        )
        return [result]
    return hazard_monitoring_service.evaluate_all(db=db, safe_simulation=req.safe_simulation_only)


@router.get("/monitoring/status", response_model=HazardMonitoringStatusResponse, tags=["Hazard Monitoring"])
def get_monitoring_status():
    """
    Returns the operational status, polling interval, configured thresholds, and recent evaluation results
    of the automated hazard monitoring service.
    """
    return hazard_monitoring_service.get_status()


@router.post("/monitoring/start", response_model=HazardMonitoringStatusResponse, tags=["Hazard Monitoring"])
def start_monitoring_scheduler(interval_seconds: Optional[float] = Query(None, ge=10.0, le=3600.0)):
    """
    Starts the persistent background automated hazard evaluation scheduler.
    """
    hazard_monitoring_service.start_scheduler(interval_seconds=interval_seconds)
    return hazard_monitoring_service.get_status()


@router.post("/monitoring/stop", response_model=HazardMonitoringStatusResponse, tags=["Hazard Monitoring"])
def stop_monitoring_scheduler():
    """
    Stops the background automated hazard evaluation scheduler.
    """
    hazard_monitoring_service.stop_scheduler()
    return hazard_monitoring_service.get_status()



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
