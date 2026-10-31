"""
AQUORA AI - Central Water Commission (CWC) Live Telemetry Schemas
Data models for CWC real-time river water-level measurements and station monitoring.
"""

from typing import List, Optional
from pydantic import BaseModel, Field


class CWCLiveStationReading(BaseModel):
    station_code: str = Field(..., description="Official CWC alphanumeric station code (e.g. 012-SWRDKOCHI)")
    station_name: str = Field(..., description="Station name (e.g. Neeleeswaram)")
    river: str = Field(..., description="River name (e.g. Periyar)")
    district: str = Field(..., description="District in Kerala (e.g. Ernakulam)")
    latitude: float = Field(..., description="Latitude coordinate")
    longitude: float = Field(..., description="Longitude coordinate")
    current_water_level_m: Optional[float] = Field(None, description="Current measured stage in metres")
    observation_time_iso: Optional[str] = Field(None, description="Observation timestamp in ISO 8601")
    observation_time_ist: Optional[str] = Field(None, description="Observation timestamp formatted in Indian Standard Time (IST)")
    retrieval_timestamp: str = Field(..., description="ISO 8601 timestamp when retrieved by AQUORA")
    data_source: str = Field(
        "Central Water Commission (CWC) Flood Forecast System",
        description="Official originating telemetry agency"
    )
    data_freshness: str = Field(
        ...,
        description="Freshness status: LIVE (<= 4h), RECENT (<= 24h), STALE (> 24h), or UNAVAILABLE"
    )
    status: str = Field(
        ...,
        description="Operational status: LIVE, RECENT, STALE, or UNAVAILABLE"
    )
    is_live: bool = Field(False, description="True if verified live measurement (< 4h)")
    is_cached: bool = Field(False, description="True if served from internal cache")
    unit: str = Field("m", description="Measurement unit (metres)")
    warning_threshold_m: Optional[float] = Field(None, description="CWC official Warning Level in metres")
    danger_threshold_m: Optional[float] = Field(None, description="CWC official Danger Level in metres")
    highest_flood_level_m: Optional[float] = Field(None, description="Historical Highest Flood Level (HFL) in metres")
    highest_flood_date: Optional[str] = Field(None, description="Date of historical Highest Flood Level")
    level_status: str = Field(
        "NORMAL",
        description="Hydrological condition: NORMAL, WARNING, DANGER, or UNKNOWN"
    )
    notice: Optional[str] = Field(None, description="Advisory or operational remark")


class CWCLiveTelemetryResponse(BaseModel):
    timestamp: str = Field(..., description="ISO 8601 generation timestamp")
    provider: str = Field(
        "Central Water Commission (CWC) - Ministry of Jal Shakti",
        description="Government telemetry provider"
    )
    provider_status: str = Field("CONNECTED", description="Provider operational state: CONNECTED, DEGRADED, or UNAVAILABLE")
    api_endpoint: str = Field(..., description="Queried CWC API endpoint URL")
    total_stations: int = Field(..., description="Total monitored CWC stations in Kerala")
    live_stations_count: int = Field(..., description="Number of stations with live observations")
    stations: List[CWCLiveStationReading] = Field(..., description="List of monitored Kerala stations")
    notice: str = Field(..., description="Advisory or provenance notice")
    disclaimer: str = Field(
        "Authentic river stage observations ingested directly from CWC Flood Forecasting System. "
        "Not fed into Ramamangalam kinematic delta forecasting model without station-specific recalibration.",
        description="Operational safety disclaimer"
    )

