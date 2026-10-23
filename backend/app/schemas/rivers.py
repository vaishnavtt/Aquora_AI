from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class NearbyRiverItem(BaseModel):
    """Represents a river or water body identified near a geographic coordinate."""
    id: Optional[int] = Field(None, description="Unique integer ID for station or OpenStreetMap feature")
    name: str = Field(..., description="Display name of the river or water body reach")
    type: str = Field(..., description="Aquatic typology: river, canal, stream, lake, reservoir, quarry, waterfall")
    latitude: float = Field(..., description="Latitude coordinate")
    longitude: float = Field(..., description="Longitude coordinate")
    distance_km: float = Field(..., description="Haversine distance in kilometers from origin")
    distance_meters: float = Field(..., description="Haversine distance in meters")
    distance_formatted: str = Field(..., description="Formatted distance for UI (e.g. '850 m' or '3.4 km')")
    district: Optional[str] = Field(None, description="Administrative district or locality in Kerala")
    basin_region: Optional[str] = Field(None, description="River basin or watershed region")
    is_monitored_station: bool = Field(..., description="Whether this is an active AQUORA telemetry station")
    has_prediction: bool = Field(..., description="Whether a validated hazard prediction model is available")
    current_risk_level: Optional[str] = Field(None, description="Risk level (low, moderate, high, extreme, no_prediction)")
    risk_category: Optional[str] = Field(None, description="Risk category (LOW, MODERATE, HIGH, VERY HIGH, NO_PREDICTION)")
    risk_score: Optional[float] = Field(None, description="0 to 100 composite risk score if assessed")
    data_source: Optional[str] = Field(None, description="Originating agency or OpenStreetMap provenance")
    last_updated: Optional[str] = Field(None, description="ISO timestamp of telemetry sync")
    description: Optional[str] = Field(None, description="Contextual physical or bathymetric description")
    assessment_scope: Optional[str] = Field(None, description="Geographic scope and model applicability statement")


class NearbyRiversResponse(BaseModel):
    """Response containing rivers and water bodies discovered within a search radius."""
    center_latitude: float = Field(..., description="Query center latitude")
    center_longitude: float = Field(..., description="Query center longitude")
    radius_km: float = Field(..., description="Search radius in kilometers")
    total_found: int = Field(..., description="Total water bodies found within radius")
    monitored_count: int = Field(..., description="Count of monitored AQUORA stations")
    unmonitored_osm_count: int = Field(..., description="Count of OpenStreetMap geographic waterways")
    rivers: List[NearbyRiverItem] = Field(..., description="List of nearby rivers sorted by distance ascending")
    disclaimer: str = Field(
        default="AQUORA AI Geospatial Notice: Distance calculated using spherical Haversine formula. "
                "Unmonitored OpenStreetMap waterways represent geographic features without real-time telemetry. "
                "A LOW hazard score indicates nominal baseline conditions, NOT a swimming safety guarantee."
    )


class RiverSearchResponse(BaseModel):
    """Response for text search across rivers, districts, and water bodies."""
    query: str = Field(..., description="Search query string")
    total_found: int = Field(..., description="Total matches found")
    results: List[NearbyRiverItem] = Field(..., description="Matching waterways and stations")


class RiskThresholdInfo(BaseModel):
    min: Optional[float]
    max_exclusive: Optional[float] = None
    max_inclusive: Optional[float] = None
    label: str
    hex: str


class RiskClassificationRuleResponse(BaseModel):
    """Authoritative classification rules and thresholds."""
    scale: str
    thresholds: Dict[str, Any]
    scientific_disclaimer: str
