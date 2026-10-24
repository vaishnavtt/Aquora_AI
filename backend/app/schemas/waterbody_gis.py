"""
AQUORA AI - Geospatial Waterbody & Preliminary Hazard Assessment Schemas.
Defines GeoJSON geometries, viewport query responses, and evidence-based hazard outputs.
"""

from typing import List, Optional, Dict, Any, Union
from pydantic import BaseModel, Field


class GeoJSONGeometry(BaseModel):
    """GeoJSON geometry representation."""
    type: str = Field(..., description="Geometry type: LineString, Polygon, Point")
    coordinates: Any = Field(..., description="Coordinates array formatted as [lon, lat] or nested array")


class WaterbodyObservationItem(BaseModel):
    """Single environmental or hydraulic telemetry observation."""
    id: Optional[int] = None
    parameter_name: str
    value: float
    unit: str
    observation_time: str
    is_stale: bool = False
    source: str
    notes: Optional[str] = None


class WaterbodyFeatureSchema(BaseModel):
    """Full geospatial waterbody record with geometry and metadata."""
    id: int
    external_id: str
    name: str
    type: str # river, stream, lake, pond, reservoir, canal, quarry, waterfall, station
    geometry_type: str # LineString, Polygon, Point
    geometry: GeoJSONGeometry
    district: Optional[str] = None
    basin_region: Optional[str] = None
    centroid_lat: float
    centroid_lon: float
    bbox: List[float] = Field(..., description="[min_lat, min_lon, max_lat, max_lon]")
    length_km: Optional[float] = None
    area_sqkm: Optional[float] = None
    data_source: str
    license: str
    data_quality: str
    is_monitored_station: bool
    is_provisional: bool = False
    assessment_basis: str = "PROVISIONAL_ESTIMATE" # SUPPORTED_BY_VERIFIED_OBSERVATIONS, PROVISIONAL_ESTIMATE, INSUFFICIENT_DATA
    assessment_basis_label: str = "Provisional estimate (rule-based assumption)"
    hazard_category: str # HIGH_HAZARD, MODERATE_HAZARD, LOW_OBSERVED_HAZARD, INSUFFICIENT_DATA, STALE_DATA
    contributing_indicators: List[str] = Field(default_factory=list)
    missing_factors: List[str] = Field(default_factory=list)
    rule_summary: Optional[str] = None
    description: Optional[str] = None
    last_assessed: Optional[str] = None
    disclaimer: str = Field(
        default="AQUORA AI Geospatial Notice: Hydrodynamic indicators are preliminary physical hazard ratings. "
                "They do not predict individual drowning likelihood and do not guarantee water safety."
    )


class WaterbodyViewportResponse(BaseModel):
    """Filtered waterbodies intersecting visible map viewport bounds."""
    total_features: int
    returned_features: int
    bbox: List[float] = Field(..., description="[min_lat, min_lon, max_lat, max_lon]")
    features: List[WaterbodyFeatureSchema]
    dataset_attribution: str = Field(
        default="OpenStreetMap contributors (ODbL), Central Water Commission (CWC), "
                "Kerala State Water Resources Department (Kerala SW)."
    )
    coverage_notes: str = Field(
        default="Covers mapped waterbodies within the queried viewport. Unmonitored features "
                "are designated INSUFFICIENT_DATA rather than assuming nominal safety."
    )


class ContributingIndicatorDetail(BaseModel):
    """Detailed observation contributing to a hazard classification."""
    indicator: str
    value: float
    unit: str
    severity: str # HIGH, MODERATE, LOW
    source: str
    observed_at: str
    description: str


class HazardAssessmentResponse(BaseModel):
    """Defensible, evidence-based preliminary hazard assessment."""
    waterbody_id: int
    external_id: str
    waterbody_name: str
    type: str
    district: Optional[str] = None
    hazard_category: str # HIGH_HAZARD, MODERATE_HAZARD, LOW_OBSERVED_HAZARD, INSUFFICIENT_DATA, STALE_DATA
    hazard_badge_color: str
    is_provisional: bool = False
    assessment_basis: str = "PROVISIONAL_ESTIMATE" # SUPPORTED_BY_VERIFIED_OBSERVATIONS, PROVISIONAL_ESTIMATE, INSUFFICIENT_DATA
    assessment_basis_label: str = "Provisional estimate (rule-based assumption)"
    contributing_indicators: List[ContributingIndicatorDetail] = Field(default_factory=list)
    missing_factors: List[str] = Field(default_factory=list)
    stale_factors: List[str] = Field(default_factory=list)
    evaluation_rules_applied: List[str] = Field(default_factory=list)
    rule_summary: str
    assessment_timestamp: str
    data_source: str
    license: str
    physical_limitations: str
    scientific_disclaimer: str = Field(
        default="AQUORA AI Scientific Integrity Notice: We do not have an individual drowning-incident dataset. "
                "This assessment evaluates physical hydrodynamic and environmental hazards only. "
                "A rating of LOW_OBSERVED_HAZARD indicates that observed indicators are within nominal historical ranges, "
                "but it DOES NOT mean the waterbody is safe for swimming. Always exercise extreme caution around all waterbodies."
    )


class WaterbodyStatsResponse(BaseModel):
    """Statistical summary of imported and mapped waterbodies across Kerala."""
    total_waterbodies: int
    counts_by_type: Dict[str, int]
    counts_by_district: Dict[str, int]
    counts_by_hazard_category: Dict[str, int]
    counts_by_geometry_type: Dict[str, int]
    data_sources: List[str]
    known_omissions_and_gaps: List[str]
    last_ingestion_date: Optional[str] = None


class WaterbodySearchResponse(BaseModel):
    """Waterbody search results by name, district, or type."""
    query: str
    district_filter: Optional[str] = None
    type_filter: Optional[str] = None
    total_found: int
    results: List[WaterbodyFeatureSchema]
