from datetime import datetime
from typing import List
from pydantic import BaseModel, Field

class HourlyReadingSchema(BaseModel):
    timestamp: datetime = Field(..., description="Observation timestamp in UTC (ISO 8601)")
    water_level_m: float = Field(..., ge=0.0, le=25.0, description="Stage height in metres")

class WaterLevelForecastRequest(BaseModel):
    station_name: str = Field(..., description="Target station name (supported: 'RAMAMANGALAM BRIDGE')")
    readings: List[HourlyReadingSchema] = Field(
        ..., min_length=13, description="At least 13 consecutive hourly telemetry observations"
    )

class WaterLevelForecastResponse(BaseModel):
    station: str
    district: str
    forecast_horizon: str
    latest_observation_timestamp: str
    forecast_target_timestamp: str
    current_water_level_m: float
    persistence_baseline_m: float
    predicted_delta_m: float
    forecasted_water_level_m: float
    rate_of_change_trend: str
    model_type: str
    is_experimental: bool
    notice: str
