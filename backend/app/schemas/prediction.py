from typing import Optional
from pydantic import BaseModel, Field

class PredictRequest(BaseModel):
    water_body_id: Optional[int] = None
    water_temp_c: float = Field(..., ge=-5.0, le=45.0, description="Water temperature in Celsius")
    flow_rate_cms: float = Field(..., ge=0.0, description="Water flow velocity in cubic meters per second")
    depth_meters: float = Field(..., ge=0.1, description="Depth in meters")
    rainfall_last_24h_mm: float = Field(..., ge=0.0, description="Rainfall accumulation in mm")
    wind_speed_kmh: float = Field(..., ge=0.0, description="Wind speed in km/h")
    visibility_meters: float = Field(..., ge=0.0, description="Visibility distance in meters")
    include_ai_explanation: bool = False

class PredictResponse(BaseModel):
    risk_score: float = Field(..., ge=0.0, le=100.0, description="Risk score from 0 to 100")
    risk_level: str = Field(..., description="low, moderate, high, extreme")
    confidence: float = Field(..., ge=0.0, le=1.0)
    primary_hazards: list[str]
    safety_recommendations: list[str]
    model_version: str
    is_baseline_model: bool
    ai_explanation: Optional[str] = None
