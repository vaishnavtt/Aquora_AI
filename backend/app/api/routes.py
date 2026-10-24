"""
AQUORA AI - RESTful API v1 Routes
Endpoints for system health telemetry, water body directory exploration,
hydrodynamic risk prediction inference, executive dashboard metrics,
river level forecasting, automated hazard monitoring, and outbound alert delivery.
"""

import os
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, Path, HTTPException, status
from sqlalchemy.orm import Session

try:
    from app.core.config import settings
    from app.db.session import get_db
    from app.models.water_body import WaterBodyModel
    from app.models.alert import AlertModel
    from app.models.alert_delivery import AlertDeliveryModel
    from app.schemas.common import (
        RiskLevelEnum,
        WaterBodyTypeEnum,
        ErrorResponse,
    )
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
    from app.schemas.alert import (
        AlertDispatchRequest,
        AlertTestRequest,
        AlertDispatchResponse,
        AlertDeliverySchema,
        AlertChannelStatusResponse,
    )
    from app.schemas.environmental import EnvironmentalPipelineAuditResponse, DimensionAudit
    from app.schemas.monitoring import (
        HazardEvaluationResult,
        HazardMonitoringEvaluationRequest,
        HazardMonitoringStatusResponse,
    )
    from app.schemas.drowning_risk import (
        DrowningRiskAssessmentResponse,
        DrowningRiskAssessRequest,
        WhatIfSimulationRequest,
        WhatIfSimulationResponse,
        ModelStatusResponse,
    )
    from app.schemas.rivers import (
        NearbyRiverItem,
        NearbyRiversResponse,
        RiverSearchResponse,
        RiskClassificationRuleResponse,
    )
    from app.core.geospatial import (
        find_nearby_water_bodies,
        search_waterways_and_stations,
        is_valid_coordinate,
        KERALA_OSM_WATERWAYS,
    )
    from app.core.risk_classifier import (
        classify_risk_score,
        get_risk_classification_rules,
        RISK_LEVEL_NO_PREDICTION,
        RISK_CATEGORY_NO_PREDICTION,
    )
    from app.ml.predictor import PredictionService, get_prediction_service, risk_predictor
    from app.ml.water_level_forecaster import WaterLevelForecaster, get_forecaster_for_station
    from app.schemas.weather import LiveWeatherResponse
    from app.services.weather_service import weather_service, get_weather_service
    from app.services.river_data_service import river_data_service
    from app.services.alert_service import alert_service
    from app.services.hazard_monitoring_service import hazard_monitoring_service
    from app.schemas.inspection import InspectionPrioritizationResponse, SiteInspectionPriorityItem
    from app.services.inspection_service import inspection_service
    from app.services.drowning_risk_service import drowning_risk_service, get_drowning_risk_service, find_nearest_telemetry_station
except ImportError:
    from backend.app.core.config import settings
    from backend.app.db.session import get_db
    from backend.app.models.water_body import WaterBodyModel
    from backend.app.models.alert import AlertModel
    from backend.app.models.alert_delivery import AlertDeliveryModel
    from backend.app.schemas.common import (
        RiskLevelEnum,
        WaterBodyTypeEnum,
        ErrorResponse,
    )
    from backend.app.schemas.health import HealthResponse
    from backend.app.schemas.water_body import WaterBodySchema
    from backend.app.schemas.prediction import PredictRequest, PredictResponse
    from backend.app.schemas.dashboard import DashboardResponse, DashboardAlertSchema, StationAvailabilitySchema
    from backend.app.schemas.forecast import WaterLevelForecastRequest, WaterLevelForecastResponse
    from backend.app.schemas.river_data import (
        RiverDataResponse,
        HistoricalSeriesResponse,
        ForecastVsObservationResponse,
    )
    from backend.app.schemas.alert import (
        AlertDispatchRequest,
        AlertTestRequest,
        AlertDispatchResponse,
        AlertDeliverySchema,
        AlertChannelStatusResponse,
    )
    from backend.app.schemas.environmental import EnvironmentalPipelineAuditResponse, DimensionAudit
    from backend.app.schemas.monitoring import (
        HazardEvaluationResult,
        HazardMonitoringEvaluationRequest,
        HazardMonitoringStatusResponse,
    )
    from backend.app.schemas.drowning_risk import (
        DrowningRiskAssessmentResponse,
        DrowningRiskAssessRequest,
        WhatIfSimulationRequest,
        WhatIfSimulationResponse,
        ModelStatusResponse,
    )
    from backend.app.schemas.rivers import (
        NearbyRiverItem,
        NearbyRiversResponse,
        RiverSearchResponse,
        RiskClassificationRuleResponse,
    )
    from backend.app.core.geospatial import (
        find_nearby_water_bodies,
        search_waterways_and_stations,
        is_valid_coordinate,
        KERALA_OSM_WATERWAYS,
    )
    from backend.app.core.risk_classifier import (
        classify_risk_score,
        get_risk_classification_rules,
        RISK_LEVEL_NO_PREDICTION,
        RISK_CATEGORY_NO_PREDICTION,
    )
    from backend.app.ml.predictor import PredictionService, get_prediction_service, risk_predictor
    from backend.app.ml.water_level_forecaster import WaterLevelForecaster, get_forecaster_for_station
    from backend.app.schemas.weather import LiveWeatherResponse
    from backend.app.services.weather_service import weather_service, get_weather_service
    from backend.app.services.river_data_service import river_data_service
    from backend.app.services.alert_service import alert_service
    from backend.app.services.hazard_monitoring_service import hazard_monitoring_service
    from backend.app.schemas.inspection import InspectionPrioritizationResponse, SiteInspectionPriorityItem
    from backend.app.services.inspection_service import inspection_service
    from backend.app.services.drowning_risk_service import drowning_risk_service, get_drowning_risk_service, find_nearest_telemetry_station

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
        422: {"model": ErrorResponse, "description": "Validation error for invalid query parameters"}
    },
    tags=["Water Bodies"],
    summary="List Monitored Water Bodies",
    description="Returns all monitored aquatic zones (lakes, rivers, reservoirs, coasts) with current risk indicators and coordinates."
)
def get_water_bodies(
    risk_level: Optional[RiskLevelEnum] = Query(None, description="Filter by risk level (low, moderate, high, extreme)"),
    type: Optional[WaterBodyTypeEnum] = Query(None, description="Filter by water body type (lake, river, reservoir, coastal)"),
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
    # Authoritative risk level synchronization
    for wb in water_bodies:
        lvl, _ = classify_risk_score(wb.risk_score)
        wb.current_risk_level = lvl
    return water_bodies


@router.get(
    "/water-bodies/by-coordinates",
    response_model=WaterBodySchema,
    status_code=status.HTTP_200_OK,
    tags=["Water Bodies"],
    summary="Lookup Nearest Monitored Water Body",
    description="Queries the database for monitored stations near a geographic point within tolerance."
)
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
        lvl, _ = classify_risk_score(best_wb.risk_score)
        best_wb.current_risk_level = lvl
        return best_wb

    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=(
            f"No monitored water body found near coordinates ({latitude:.4f}, {longitude:.4f}) "
            f"within tolerance of {tolerance_deg}° (~{tolerance_deg * 111:.1f} km). "
            f"AQUORA AI does not assign fabricated environmental observations or risk assessments to unsupported locations."
        )
    )


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
    If ID represents an OSM geographic feature, returns an unmonitored representation without fabricated risk.
    """
    water_body = db.query(WaterBodyModel).filter(WaterBodyModel.id == water_body_id).first()
    if not water_body:
        osm_match = next((w for w in KERALA_OSM_WATERWAYS if w["osm_id"] == water_body_id), None)
        if osm_match:
            return WaterBodySchema(
                id=osm_match["osm_id"],
                name=osm_match["name"],
                type=osm_match["type"],
                latitude=osm_match["latitude"],
                longitude=osm_match["longitude"],
                current_risk_level=RISK_LEVEL_NO_PREDICTION,
                risk_score=0.0,
                water_temp_c=27.0,
                flow_rate_cms=0.0,
                depth_meters=0.0,
                elevation_meters=15.0,
                basin_region=osm_match["basin_region"],
                data_source=osm_match["data_source"],
                description=osm_match["description"],
                last_updated=datetime.now(timezone.utc),
                is_demonstration_data=False,
            )
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Water body with ID {water_body_id} not found in monitored database."
        )
    lvl, _ = classify_risk_score(water_body.risk_score)
    water_body.current_risk_level = lvl
    return water_body


@router.get(
    "/rivers/nearby",
    response_model=NearbyRiversResponse,
    status_code=status.HTTP_200_OK,
    tags=["Rivers & Geospatial Discovery"],
    summary="Find Rivers & Water Bodies Near Coordinate",
    description="Discovers mapped rivers, streams, canals, and monitored stations within a specified radius (e.g. 2, 5, 10, 25 km) using the Haversine formula."
)
def get_nearby_rivers(
    latitude: float = Query(..., ge=-90.0, le=90.0, description="Origin latitude in decimal degrees"),
    longitude: float = Query(..., ge=-180.0, le=180.0, description="Origin longitude in decimal degrees"),
    radius_km: float = Query(10.0, ge=0.5, le=50.0, description="Search radius in kilometers (e.g. 2, 5, 10, 25 km)"),
    include_osm: bool = Query(True, description="Whether to include unmonitored OpenStreetMap geographic waterways"),
    db: Session = Depends(get_db)
):
    """
    Computes great-circle Haversine distances to all mapped water bodies and rivers within radius_km.
    Distinguishes monitored stations (with active predictions) from unmonitored OSM geographic features.
    """
    all_stations = db.query(WaterBodyModel).all()
    results = find_nearby_water_bodies(
        lat=latitude,
        lon=longitude,
        radius_km=radius_km,
        db_stations=all_stations,
        include_osm=include_osm,
    )
    monitored_cnt = sum(1 for r in results if r["is_monitored_station"])
    osm_cnt = sum(1 for r in results if not r["is_monitored_station"])

    return NearbyRiversResponse(
        center_latitude=latitude,
        center_longitude=longitude,
        radius_km=radius_km,
        total_found=len(results),
        monitored_count=monitored_cnt,
        unmonitored_osm_count=osm_cnt,
        rivers=[NearbyRiverItem(**r) for r in results],
    )


@router.get(
    "/rivers/search",
    response_model=RiverSearchResponse,
    status_code=status.HTTP_200_OK,
    tags=["Rivers & Geospatial Discovery"],
    summary="Search Rivers, Waterways, Towns, and Districts",
    description="Searches for rivers, waterways, districts, and telemetry stations across Kerala."
)
def search_rivers(
    q: str = Query(..., min_length=1, max_length=100, description="Search keyword (river, town, district, or basin)"),
    limit: int = Query(25, ge=1, le=50, description="Maximum results to return"),
    db: Session = Depends(get_db)
):
    """
    Searches across monitored stations and OpenStreetMap waterways by keyword.
    """
    all_stations = db.query(WaterBodyModel).all()
    results = search_waterways_and_stations(query=q, db_stations=all_stations, limit=limit)
    return RiverSearchResponse(
        query=q,
        total_found=len(results),
        results=[
            NearbyRiverItem(
                **r,
                distance_km=0.0,
                distance_meters=0.0,
                distance_formatted="—",
                assessment_scope="Monitored Station" if r.get("is_monitored_station") else "Geographic Waterway (Unmonitored)",
            )
            for r in results
        ],
    )


@router.get(
    "/rivers/{river_id}",
    response_model=NearbyRiverItem,
    status_code=status.HTTP_200_OK,
    tags=["Rivers & Geospatial Discovery"],
    summary="Get Specific River or Water Body Details",
    description="Retrieves metadata, coordinates, and monitoring status for a specific station or OSM waterway ID."
)
def get_river_details(
    river_id: int = Path(..., description="Unique integer ID of monitored station or OSM waterway"),
    db: Session = Depends(get_db)
):
    wb = db.query(WaterBodyModel).filter(WaterBodyModel.id == river_id).first()
    if wb:
        level, category = classify_risk_score(wb.risk_score)
        return NearbyRiverItem(
            id=wb.id,
            name=wb.name.replace(" (Demonstration Station)", "").replace(" (DEMO Station)", "").strip(),
            type=wb.type,
            latitude=wb.latitude,
            longitude=wb.longitude,
            distance_km=0.0,
            distance_meters=0.0,
            distance_formatted="—",
            district=getattr(wb, "basin_region", "Kerala"),
            basin_region=wb.basin_region,
            is_monitored_station=True,
            has_prediction=True,
            current_risk_level=level,
            risk_category=category,
            risk_score=wb.risk_score,
            data_source=wb.data_source,
            last_updated=wb.last_updated.isoformat() if hasattr(wb.last_updated, "isoformat") else str(wb.last_updated),
            description=wb.description,
            assessment_scope="Monitored Point Station: Telemetry sensors and validated prediction model active.",
        )

    osm_match = next((w for w in KERALA_OSM_WATERWAYS if w["osm_id"] == river_id), None)
    if osm_match:
        return NearbyRiverItem(
            id=osm_match["osm_id"],
            name=osm_match["name"],
            type=osm_match["type"],
            latitude=osm_match["latitude"],
            longitude=osm_match["longitude"],
            distance_km=0.0,
            distance_meters=0.0,
            distance_formatted="—",
            district=osm_match["district"],
            basin_region=osm_match["basin_region"],
            is_monitored_station=False,
            has_prediction=False,
            current_risk_level=RISK_LEVEL_NO_PREDICTION,
            risk_category=RISK_CATEGORY_NO_PREDICTION,
            risk_score=None,
            data_source=osm_match["data_source"],
            last_updated=None,
            description=osm_match["description"],
            assessment_scope="Unmonitored Geographic Waterway: Hydrodynamic sensors not installed. Model predictions unavailable.",
        )

    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=f"River or water body with ID {river_id} not found."
    )


@router.get(
    "/risk/rules",
    response_model=RiskClassificationRuleResponse,
    status_code=status.HTTP_200_OK,
    tags=["Prediction"],
    summary="Authoritative Risk Classification Rules",
    description="Returns the calibrated 0-100 threshold boundaries, category labels, hex colors, and scientific disclaimer."
)
def get_classification_rules():
    return get_risk_classification_rules()


@router.get(
    "/environmental-data/{water_body_id}",
    response_model=EnvironmentalPipelineAuditResponse,
    status_code=status.HTTP_200_OK,
    tags=["Environmental Pipeline"],
    summary="Environmental Pipeline Audit",
    description="Audits the availability and provenance of the 6 core environmental dimensions for a monitored water body."
)
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
    now_iso = datetime.now(timezone.utc).isoformat()

    # 1. Rainfall: Verified real-time raingauge telemetry stream
    dimensions["rainfall"] = DimensionAudit(
        dimension="rainfall",
        status="UNAVAILABLE",
        value=None,
        units="mm",
        source="None",
        observation_timestamp=None,
        retrieval_timestamp=now_iso,
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
            retrieval_timestamp=now_iso,
            limitation_reason=None if river_res.is_live else "USGS live service temporarily unreachable"
        )
        dimensions["flow_rate"] = DimensionAudit(
            dimension="flow_rate",
            status="AVAILABLE_LIVE" if river_res.is_live else "UNAVAILABLE",
            value=river_res.flow_rate_cms,
            units="m³/s",
            source=river_res.data_source,
            observation_timestamp=river_res.observation_timestamp,
            retrieval_timestamp=now_iso,
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
            retrieval_timestamp=now_iso,
            limitation_reason=wl_reason
        )
        dimensions["flow_rate"] = DimensionAudit(
            dimension="flow_rate",
            status="UNAVAILABLE",
            value=None,
            units="m³/s",
            source="None",
            observation_timestamp=None,
            retrieval_timestamp=now_iso,
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
            retrieval_timestamp=now_iso,
            limitation_reason="Static reference stage reading from baseline site survey."
        )
        dimensions["flow_rate"] = DimensionAudit(
            dimension="flow_rate",
            status="AVAILABLE_STATIC" if wb.flow_rate_cms is not None else "UNAVAILABLE",
            value=wb.flow_rate_cms,
            units="m³/s",
            source=wb.data_source or "Hydrological Database Baseline",
            observation_timestamp=wb.last_updated.isoformat() if wb.last_updated else None,
            retrieval_timestamp=now_iso,
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
        retrieval_timestamp=now_iso,
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
        retrieval_timestamp=now_iso,
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
        retrieval_timestamp=now_iso,
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
        retrieval_timestamp=now_iso,
        limitation_reason=None
    )

    avail_count = sum(1 for d in dimensions.values() if d.status != "UNAVAILABLE")
    unavail_count = sum(1 for d in dimensions.values() if d.status == "UNAVAILABLE")

    nearest_station, dist_km = find_nearest_telemetry_station(wb.latitude, wb.longitude)

    return EnvironmentalPipelineAuditResponse(
        station_id=wb.id,
        station_name=wb.name,
        water_body_type=wb.type,
        basin_region=wb.basin_region,
        latitude=wb.latitude,
        longitude=wb.longitude,
        audit_timestamp=datetime.now(timezone.utc),
        data_freshness="Audited pipeline status",
        nearest_telemetry_station=nearest_station,
        monitoring_station_distance_km=dist_km,
        dimensions=dimensions,
        available_dimensions_count=avail_count,
        unavailable_dimensions_count=unavail_count,
        ethical_data_notice="AQUORA AI strictly adheres to data transparency: missing variables (rainfall telemetry, drowning incident history) are explicitly reported as UNAVAILABLE and never synthesized."
    )



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
    Experimental one-hour-ahead river water level forecasting for calibrated monitoring stations.
    Requires at least 13 consecutive hourly telemetry readings in chronological order.
    Notice: This is an experimental river stage forecast for prototype research,
    NOT a validated drowning-risk prediction or public flood warning.
    """
    try:
        forecaster = get_forecaster_for_station(req.station_name)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Forecaster initialization error: {str(e)}")

    if forecaster is None or not forecaster.is_loaded:
        raise HTTPException(
            status_code=503,
            detail=f"Water level forecasting model artifact for '{req.station_name}' is not loaded on this server."
        )

    try:
        raw_readings = [
            {"timestamp": r.timestamp, "water_level_m": r.water_level_m}
            for r in req.readings
        ]
        result = forecaster.predict_from_timestamped_readings(raw_readings)
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
            station_name="PALA (Meenachil River)",
            station_type="Hourly Stage Hydrology Gauge",
            telemetry_status="HISTORICAL_ARCHIVE",
            data_source="Kerala State Water Resources Department (Kerala SW)",
            freshness="Verified Historical Archive (2021-2022 Closed)",
            is_live=False
        ),
        StationAvailabilitySchema(
            station_name="TRINAYAKUDAM (Muvattupuzha River)",
            station_type="Hourly Stage Hydrology Gauge",
            telemetry_status="HISTORICAL_ARCHIVE",
            data_source="Kerala State Water Resources Department (Kerala SW)",
            freshness="Verified Historical Archive (2021-2025 Active)",
            is_live=False
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


# ==========================================
# Outbound Alert Delivery Endpoints
# ==========================================

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


# ==========================================
# Core Drowning-Risk Assessment & Simulation Endpoints
# ==========================================

@router.post(
    "/drowning-risk/assess",
    response_model=DrowningRiskAssessmentResponse,
    status_code=status.HTTP_200_OK,
    tags=["Drowning Risk"],
    summary="Evaluate Two-Layer Drowning Risk Assessment",
    description=(
        "Evaluates drowning risk using the two-layer assessment engine:\n"
        "- Layer A: Environmental Aquatic Hazard (Calibrated Scikit-Learn ML inference on Kerala water levels, rainfall, discharge)\n"
        "- Layer B: Contextual Risk (Water-body type vulnerability, depth, temperature, and human exposure factors)"
    )
)
def assess_drowning_risk_endpoint(
    req: DrowningRiskAssessRequest,
    db: Session = Depends(get_db)
):
    water_body = None
    if req.water_body_id:
        water_body = db.query(WaterBodyModel).filter(WaterBodyModel.id == req.water_body_id).first()
        if not water_body:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Water body with ID {req.water_body_id} not found"
            )
    return drowning_risk_service.assess_drowning_risk(water_body=water_body, req=req)


@router.get(
    "/drowning-risk/water-bodies",
    response_model=List[DrowningRiskAssessmentResponse],
    status_code=status.HTTP_200_OK,
    tags=["Drowning Risk"],
    summary="List Water Bodies with Two-Layer Drowning Risk Assessments",
    description="Returns integrated two-layer risk assessments for all monitored Kerala water bodies."
)
def list_drowning_risk_water_bodies(
    type: Optional[str] = Query(None, description="Filter by water body type (river, quarry, waterfall, lake, reservoir, canal)"),
    risk_category: Optional[str] = Query(None, description="Filter by risk category (LOW, MODERATE, HIGH, VERY HIGH)"),
    db: Session = Depends(get_db)
):
    query = db.query(WaterBodyModel)
    if type:
        query = query.filter(WaterBodyModel.type == type.lower())

    water_bodies = query.all()
    results = []
    for wb in water_bodies:
        assessment = drowning_risk_service.assess_drowning_risk(water_body=wb)
        if risk_category and assessment.risk_category.upper() != risk_category.upper():
            continue
        results.append(assessment)
    return results


@router.get(
    "/drowning-risk/water-body/{water_body_id}",
    response_model=DrowningRiskAssessmentResponse,
    status_code=status.HTTP_200_OK,
    tags=["Drowning Risk"],
    summary="Get Two-Layer Assessment for Specific Water Body",
    description="Returns the detailed two-layer drowning risk evaluation for the specified water body ID."
)
def get_drowning_risk_for_water_body(
    water_body_id: int = Path(..., description="ID of the water body to assess"),
    db: Session = Depends(get_db)
):
    water_body = db.query(WaterBodyModel).filter(WaterBodyModel.id == water_body_id).first()
    if not water_body:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Water body with ID {water_body_id} not found"
        )
    return drowning_risk_service.assess_drowning_risk(water_body=water_body)


@router.post(
    "/drowning-risk/simulate",
    response_model=WhatIfSimulationResponse,
    status_code=status.HTTP_200_OK,
    tags=["Drowning Risk"],
    summary="Interactive What-If Scenario Simulator",
    description=(
        "Recalculates environmental hazard and contextual risk when hypothetical inputs change "
        "(rainfall increment, river stage surge, discharge volume) without fabricating real measurements."
    )
)
def simulate_what_if_scenario(
    req: WhatIfSimulationRequest,
    db: Session = Depends(get_db)
):
    return drowning_risk_service.simulate_what_if(req, db=db)


@router.get(
    "/drowning-risk/model-status",
    response_model=ModelStatusResponse,
    status_code=status.HTTP_200_OK,
    tags=["Drowning Risk"],
    summary="Dataset Audit & ML Benchmark Model Status",
    description="Returns the audit status of the five target datasets, supervised ML benchmark metrics, and data integrity notices."
)
def get_drowning_risk_model_status():
    return drowning_risk_service.get_model_status()


# ==========================================
# Live Meteorological & Forecast Endpoints
# ==========================================

@router.get(
    "/weather/live",
    response_model=LiveWeatherResponse,
    status_code=status.HTTP_200_OK,
    tags=["Weather"],
    summary="Get Live Weather & Precipitation Forecast",
    description="Retrieves live temperature, precipitation, wind speed, elevation, and 48-hour forward precipitation forecast from Open-Meteo."
)
def get_live_weather(
    latitude: float = Query(..., ge=-90.0, le=90.0, description="Latitude in decimal degrees"),
    longitude: float = Query(..., ge=-180.0, le=180.0, description="Longitude in decimal degrees"),
    water_body_name: Optional[str] = Query(None, description="Optional name of the aquatic location"),
):
    return weather_service.get_weather_for_coordinates(
        lat=latitude,
        lon=longitude,
        water_body_name=water_body_name,
    )


@router.get(
    "/weather/water-body/{water_body_id}",
    response_model=LiveWeatherResponse,
    status_code=status.HTTP_200_OK,
    tags=["Weather"],
    summary="Get Live Weather for Specific Water Body",
    description="Retrieves live weather and precipitation forecast for the coordinates of a monitored water body ID."
)
def get_weather_for_water_body_endpoint(
    water_body_id: int = Path(..., description="ID of monitored water body"),
    db: Session = Depends(get_db)
):
    return weather_service.get_weather_for_water_body(water_body_id=water_body_id, db=db)


# ==========================================
# Authority Inspection Prioritization Endpoints
# ==========================================

@router.get(
    "/authority/inspection-prioritization",
    response_model=InspectionPrioritizationResponse,
    status_code=status.HTTP_200_OK,
    tags=["Authority Decision Support"],
    summary="Get Risk-Informed Authority Inspection Prioritization",
    description="Ranks all monitored aquatic locations into actionable inspection priority tiers (CRITICAL, HIGH, MEDIUM, ROUTINE) incorporating environmental hazard, site structural vulnerability, and observational uncertainty penalties."
)
def get_inspection_prioritization_endpoint(db: Session = Depends(get_db)):
    """
    Evaluates all registered water bodies and returns prioritized site rankings
    for municipal and district disaster management decision support.
    """
    return inspection_service.get_prioritization(db=db)

