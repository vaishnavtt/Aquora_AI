from typing import Optional
from pydantic import BaseModel, Field

class LatestHistoricalReading(BaseModel):
    timestamp: str = Field(..., description="ISO 8601 UTC timestamp of the last historical record")
    water_level_m: float = Field(..., description="Recorded river stage in metres")
    description: str = Field(..., description="Context for the historical sample reading")

class RiverDataResponse(BaseModel):
    station_name: str = Field(..., json_schema_extra={"example": "RAMAMANGALAM BRIDGE"})
    district: str = Field("ERNAKULAM", json_schema_extra={"example": "ERNAKULAM"})
    status: str = Field(..., description="Telemetry status: LIVE, CACHED, HISTORICAL, or UNAVAILABLE", json_schema_extra={"example": "UNAVAILABLE"})
    water_level_m: Optional[float] = Field(None, description="Observed stage level in metres if available")
    flow_rate_cms: Optional[float] = Field(None, description="Observed discharge rate in cubic metres per second if available")
    observation_timestamp: Optional[str] = Field(None, description="ISO 8601 observation timestamp")
    is_live: bool = Field(False, description="Whether data originates from verified live streaming telemetry")
    is_cached: bool = Field(False, description="Whether the response was served from cache")
    data_source: str = Field(..., description="Originating government water resources telemetry agency")
    data_freshness: str = Field(..., description="Freshness assessment of the reading")
    notice: str = Field(..., description="Advisory or disclaimer regarding telemetry nature")
    access_requirements: Optional[str] = Field(None, description="Official credentials or gateway access needed for live feed")
    latest_historical_reading: Optional[LatestHistoricalReading] = Field(None, description="Last recorded historical reading from telemetry archive")
