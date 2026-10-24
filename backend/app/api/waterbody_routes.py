"""
AQUORA AI - Mapped Waterbodies & Transparent Hazard Assessment API Endpoints.
Provides high-performance viewport bounding-box queries, name/district search,
single-feature geometry inspection, and evidence-based hazard evaluations.
"""

import json
from typing import Optional, List
from fastapi import APIRouter, Depends, Query, Path, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_

from app.db.session import get_db
from app.models.mapped_waterbody import MappedWaterbodyModel, WaterbodyObservationModel
from app.schemas.waterbody_gis import (
    GeoJSONGeometry,
    WaterbodyFeatureSchema,
    WaterbodyViewportResponse,
    HazardAssessmentResponse,
    WaterbodyStatsResponse,
    WaterbodySearchResponse,
    WaterbodyObservationItem,
)
from app.services.hazard_assessment_service import hazard_assessment_service
from app.services.waterbody_ingestion_service import waterbody_ingestion_service

router = APIRouter(prefix="/waterbodies", tags=["Kerala Waterbody GIS & Hazard Assessment"])


def _model_to_feature_schema(wb: MappedWaterbodyModel) -> WaterbodyFeatureSchema:
    """Helper converting ORM model to Pydantic feature schema with parsed GeoJSON geometry."""
    try:
        coords = json.loads(wb.coordinates_json)
    except Exception:
        coords = [wb.centroid_lon, wb.centroid_lat]

    contributing = []
    missing = []
    rule_summary = None
    if wb.hazard_assessment_json:
        try:
            haz_data = json.loads(wb.hazard_assessment_json)
            contributing = [c.get("indicator", "") for c in haz_data.get("contributing_indicators", [])]
            missing = haz_data.get("missing_factors", [])
            rule_summary = haz_data.get("rule_summary")
        except Exception:
            pass

    return WaterbodyFeatureSchema(
        id=wb.id,
        external_id=wb.external_id,
        name=wb.name,
        type=wb.type,
        geometry_type=wb.geometry_type,
        geometry=GeoJSONGeometry(type=wb.geometry_type, coordinates=coords),
        district=wb.district,
        basin_region=wb.basin_region,
        centroid_lat=wb.centroid_lat,
        centroid_lon=wb.centroid_lon,
        bbox=[wb.bbox_min_lat, wb.bbox_min_lon, wb.bbox_max_lat, wb.bbox_max_lon],
        length_km=wb.length_km,
        area_sqkm=wb.area_sqkm,
        data_source=wb.data_source,
        license=wb.license,
        data_quality=wb.data_quality,
        is_monitored_station=wb.is_monitored_station,
        hazard_category=wb.hazard_category or "INSUFFICIENT_DATA",
        contributing_indicators=contributing,
        missing_factors=missing,
        rule_summary=rule_summary,
        description=wb.description,
        last_assessed=wb.last_assessed.isoformat() if wb.last_assessed else None,
    )


@router.get(
    "/viewport",
    response_model=WaterbodyViewportResponse,
    status_code=status.HTTP_200_OK,
    summary="Query Waterbodies Within Viewport Bounding Box",
    description="Loads mapped rivers, streams, lakes, reservoirs, ponds, canals, and stations intersecting map bounds."
)
def get_waterbodies_in_viewport(
    min_lat: float = Query(8.15, description="South bounding latitude"),
    min_lon: float = Query(74.75, description="West bounding longitude"),
    max_lat: float = Query(12.90, description="North bounding latitude"),
    max_lon: float = Query(77.60, description="East bounding longitude"),
    types: Optional[str] = Query(None, description="Comma-separated aquatic types (e.g. river,lake,reservoir,quarry,station)"),
    district: Optional[str] = Query(None, description="Optional Kerala district filter"),
    limit: int = Query(300, ge=1, le=1000, description="Max features to return"),
    db: Session = Depends(get_db)
):
    """
    Spatial intersection query against indexed bounding-box columns:
    bbox_max_lat >= min_lat AND bbox_min_lat <= max_lat AND bbox_max_lon >= min_lon AND bbox_min_lon <= max_lon
    """
    query = db.query(MappedWaterbodyModel).filter(
        MappedWaterbodyModel.bbox_max_lat >= min_lat,
        MappedWaterbodyModel.bbox_min_lat <= max_lat,
        MappedWaterbodyModel.bbox_max_lon >= min_lon,
        MappedWaterbodyModel.bbox_min_lon <= max_lon,
    )

    if types:
        type_list = [t.strip().lower() for t in types.split(",") if t.strip()]
        if type_list:
            query = query.filter(MappedWaterbodyModel.type.in_(type_list))

    if district and district.strip().lower() != "all":
        query = query.filter(MappedWaterbodyModel.district.ilike(f"%{district.strip()}%"))

    total_count = query.count()
    records = query.limit(limit).all()

    features = [_model_to_feature_schema(wb) for wb in records]

    return WaterbodyViewportResponse(
        total_features=total_count,
        returned_features=len(features),
        bbox=[min_lat, min_lon, max_lat, max_lon],
        features=features,
    )


@router.get(
    "/search",
    response_model=WaterbodySearchResponse,
    status_code=status.HTTP_200_OK,
    summary="Search Waterbodies by Name, District, or Type",
    description="Full-text and substring search across all mapped Kerala waterbody features."
)
def search_waterbodies(
    q: str = Query(..., min_length=1, description="Search term for waterbody or district name"),
    district: Optional[str] = Query(None, description="Optional district filter"),
    type: Optional[str] = Query(None, description="Optional type filter (river, lake, reservoir, quarry, waterfall, station)"),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db)
):
    """Searches waterbodies matching name, district, or basin."""
    query = db.query(MappedWaterbodyModel)

    term = f"%{q.strip()}%"
    query = query.filter(
        or_(
            MappedWaterbodyModel.name.ilike(term),
            MappedWaterbodyModel.district.ilike(term),
            MappedWaterbodyModel.basin_region.ilike(term),
            MappedWaterbodyModel.type.ilike(term),
        )
    )

    if district and district.strip().lower() != "all":
        query = query.filter(MappedWaterbodyModel.district.ilike(f"%{district.strip()}%"))

    if type and type.strip().lower() != "all":
        query = query.filter(MappedWaterbodyModel.type.ilike(type.strip()))

    total = query.count()
    results = query.limit(limit).all()

    return WaterbodySearchResponse(
        query=q,
        district_filter=district,
        type_filter=type,
        total_found=total,
        results=[_model_to_feature_schema(wb) for wb in results],
    )


@router.get(
    "/stats",
    response_model=WaterbodyStatsResponse,
    status_code=status.HTTP_200_OK,
    summary="Geospatial Waterbody Dataset Statistics & Coverage Audit",
    description="Returns aggregate counts by type, district, hazard category, data sources, and documented omissions."
)
def get_waterbody_stats(db: Session = Depends(get_db)):
    """Computes distribution statistics across mapped Kerala waterbodies."""
    records = db.query(MappedWaterbodyModel).all()
    total = len(records)

    by_type = {}
    by_district = {}
    by_hazard = {}
    by_geom = {}
    sources = set()

    for r in records:
        t = r.type
        by_type[t] = by_type.get(t, 0) + 1

        d = r.district or "Unassigned"
        by_district[d] = by_district.get(d, 0) + 1

        h = r.hazard_category or "INSUFFICIENT_DATA"
        by_hazard[h] = by_hazard.get(h, 0) + 1

        g = r.geometry_type
        by_geom[g] = by_geom.get(g, 0) + 1

        if r.data_source:
            sources.add(r.data_source)

    known_omissions = [
        "Minor village ponds, agrarian tanks, and private irrigation wells below 0.01 sq km are omitted unless mapped in official state inventories.",
        "Ephemeral first-order hill streams that only flow during monsoon Cloudburst events are omitted until verified by hydrological field survey.",
        "Tidal estuarine channels within dense mangrove sanctuaries are modeled as primary waterways without micro-channel branches.",
        "Privately excavated gravel and laterite pits not registered with Kerala Department of Mining & Geology are absent.",
        "Real-time hydrodynamic prediction is strictly NOT synthesized for unmonitored reaches; these remain designated INSUFFICIENT_DATA."
    ]

    return WaterbodyStatsResponse(
        total_waterbodies=total,
        counts_by_type=by_type,
        counts_by_district=by_district,
        counts_by_hazard_category=by_hazard,
        counts_by_geometry_type=by_geom,
        data_sources=sorted(list(sources)),
        known_omissions_and_gaps=known_omissions,
    )


@router.get(
    "/{waterbody_id}",
    response_model=WaterbodyFeatureSchema,
    status_code=status.HTTP_200_OK,
    summary="Get Mapped Waterbody Geometry & Metadata by ID"
)
def get_waterbody_by_id(
    waterbody_id: int = Path(..., ge=1, description="Primary key identifier"),
    db: Session = Depends(get_db)
):
    """Retrieves single waterbody with full geometry."""
    wb = db.query(MappedWaterbodyModel).filter(MappedWaterbodyModel.id == waterbody_id).first()
    if not wb:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Waterbody with ID {waterbody_id} not found."
        )
    return _model_to_feature_schema(wb)


@router.get(
    "/{waterbody_id}/assessment",
    response_model=HazardAssessmentResponse,
    status_code=status.HTTP_200_OK,
    summary="Retrieve Transparent Preliminary Hazard Assessment"
)
def get_waterbody_hazard_assessment(
    waterbody_id: int = Path(..., ge=1),
    db: Session = Depends(get_db)
):
    """Retrieves or recalculates rule-based preliminary hazard assessment."""
    wb = db.query(MappedWaterbodyModel).filter(MappedWaterbodyModel.id == waterbody_id).first()
    if not wb:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Waterbody not found.")

    assessment = hazard_assessment_service.evaluate_waterbody_hazard(wb)
    return assessment


@router.post(
    "/{waterbody_id}/assessment",
    response_model=HazardAssessmentResponse,
    status_code=status.HTTP_200_OK,
    summary="Evaluate Evidence-Based Preliminary Hazard Assessment"
)
def trigger_waterbody_hazard_assessment(
    waterbody_id: int = Path(..., ge=1),
    db: Session = Depends(get_db)
):
    """Triggers and persists fresh evaluation of evidence-based hazard rules."""
    wb = db.query(MappedWaterbodyModel).filter(MappedWaterbodyModel.id == waterbody_id).first()
    if not wb:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Waterbody not found.")

    assessment = hazard_assessment_service.evaluate_waterbody_hazard(wb)

    wb.hazard_category = assessment.hazard_category
    wb.hazard_assessment_json = assessment.model_dump_json()
    wb.last_assessed = datetime.now(timezone.utc)
    db.commit()

    return assessment


@router.get(
    "/{waterbody_id}/observations",
    response_model=List[WaterbodyObservationItem],
    status_code=status.HTTP_200_OK,
    summary="List Environmental Telemetry Observations"
)
def get_waterbody_observations(
    waterbody_id: int = Path(..., ge=1),
    db: Session = Depends(get_db)
):
    """Retrieves all linked observations for a waterbody."""
    wb = db.query(MappedWaterbodyModel).filter(MappedWaterbodyModel.id == waterbody_id).first()
    if not wb:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Waterbody not found.")

    obs = db.query(WaterbodyObservationModel).filter(
        WaterbodyObservationModel.waterbody_id == waterbody_id
    ).all()

    return [
        WaterbodyObservationItem(
            id=o.id,
            parameter_name=o.parameter_name,
            value=o.value,
            unit=o.unit,
            observation_time=o.observation_time.isoformat(),
            is_stale=o.is_stale,
            source=o.source,
            notes=o.notes,
        )
        for o in obs
    ]


@router.post(
    "/ingest",
    status_code=status.HTTP_200_OK,
    summary="Execute Waterbody Dataset Ingestion & Validation Pipeline"
)
def trigger_ingestion(db: Session = Depends(get_db)):
    """Triggers full dataset ingestion, geometry validation, and telemetry sync."""
    result = waterbody_ingestion_service.ingest_seed_dataset(db)
    return result
