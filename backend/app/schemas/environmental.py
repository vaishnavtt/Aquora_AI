from datetime import datetime
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, ConfigDict


class DimensionAudit(BaseModel):
    dimension: str
    status: str  # "AVAILABLE_LIVE", "AVAILABLE_HISTORICAL", "AVAILABLE_STATIC", "UNAVAILABLE"
    value: Optional[Any] = None
    units: Optional[str] = None
    source: Optional[str] = None
    observation_timestamp: Optional[str] = None
    retrieval_timestamp: Optional[str] = None
    limitation_reason: Optional[str] = None


class EnvironmentalPipelineAuditResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    station_id: Optional[int] = None
    station_name: str
    water_body_type: str
    basin_region: Optional[str] = None
    latitude: float
    longitude: float
    audit_timestamp: datetime
    data_freshness: str
    nearest_telemetry_station: Optional[str] = None
    monitoring_station_distance_km: Optional[float] = None
    dimensions: Dict[str, DimensionAudit]
    available_dimensions_count: int
    unavailable_dimensions_count: int
    ethical_data_notice: str
