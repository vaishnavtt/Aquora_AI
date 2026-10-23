"""
AQUORA AI - Live Meteorological & Weather Forecast Schemas
Provides validated models for live rainfall telemetry and 24-48h forecast integration.
"""

from typing import List, Optional
from pydantic import BaseModel, Field


class LiveHourlyPrecipitation(BaseModel):
    time: str = Field(..., description="ISO observation or forecast timestamp")
    precipitation_mm: float = Field(..., description="Precipitation in millimetres for this 1-hour interval")
    temperature_c: Optional[float] = Field(None, description="Ambient air temperature in °C")


class LiveWeatherResponse(BaseModel):
    water_body_id: Optional[int] = Field(None, description="Water body identifier if queried by station")
    water_body_name: Optional[str] = Field(None, description="Water body name")
    latitude: float = Field(..., description="Geographic latitude")
    longitude: float = Field(..., description="Geographic longitude")
    current_temperature_c: float = Field(..., description="Current ambient air temperature in °C")
    current_precipitation_mm_h: float = Field(..., description="Current precipitation intensity in mm/hour")
    weather_condition: str = Field(..., description="Human-readable weather description (e.g. Monsoon Rain, Clear)")
    wind_speed_kmh: float = Field(..., description="Wind speed at 10m height in km/h")
    accumulated_24h_rainfall_mm: float = Field(..., description="Cumulative 24-hour rainfall in mm")
    forecast_24h_rainfall_mm: float = Field(..., description="Projected forward 24-hour rainfall runoff in mm")
    elevation_m: Optional[float] = Field(None, description="Ground elevation in metres MSL from DEM")
    hourly_forecast: List[LiveHourlyPrecipitation] = Field(default_factory=list, description="Hourly forward forecast")
    is_live_data: bool = Field(True, description="True if fetched live from Open-Meteo, False if fallback")
    data_source: str = Field("Open-Meteo Weather API", description="Originating weather provider")
    observation_timestamp: Optional[str] = Field(None, description="ISO timestamp of the underlying meteorological observation/forecast cycle")
    retrieval_timestamp: Optional[str] = Field(None, description="ISO timestamp of API retrieval by AQUORA")
    fetched_at: str = Field(..., description="Timestamp of API retrieval (legacy alias for retrieval_timestamp)")
    disclaimer: str = Field(
        default="Live meteorological conditions retrieved via Open-Meteo API. Forecasts represent atmospheric projections.",
        description="Data provenance notice"
    )
