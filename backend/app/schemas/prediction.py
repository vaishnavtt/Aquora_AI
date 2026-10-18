from typing import Optional, List
from pydantic import BaseModel, Field, model_validator
from backend.app.schemas.common import RiskLevelEnum

class PredictRequest(BaseModel):
    water_body_id: Optional[int] = Field(
        default=None,
        ge=1,
        description="Optional database ID of monitored water body for context-specific evaluation."
    )
    water_temp_c: float = Field(
        ...,
        ge=-5.0,
        le=45.0,
        description="Water surface/column temperature in Celsius. Valid operational range: -5.0°C to 45.0°C."
    )
    flow_rate_cms: float = Field(
        ...,
        ge=0.0,
        description="Hydrodynamic flow rate velocity in cubic meters per second (m³/s). Must be non-negative."
    )
    depth_meters: float = Field(
        ...,
        ge=0.1,
        description="Water depth in meters. Minimum measurable depth: 0.1m."
    )
    rainfall_last_24h_mm: float = Field(
        ...,
        ge=0.0,
        description="Cumulative precipitation over the preceding 24 hours in millimeters (mm). Must be non-negative."
    )
    wind_speed_kmh: float = Field(
        ...,
        ge=0.0,
        description="Sustained surface wind velocity in kilometers per hour (km/h). Must be non-negative."
    )
    visibility_meters: float = Field(
        ...,
        ge=0.0,
        description="Horizontal atmospheric and water visibility distance in meters. Must be non-negative."
    )
    include_ai_explanation: bool = Field(
        default=False,
        description="Flag to trigger generative plain-language safety advisory via Google Gemini API."
    )

    model_config = {
        "json_schema_extra": {
            "example": {
                "water_body_id": 1,
                "water_temp_c": 13.5,
                "flow_rate_cms": 8.2,
                "depth_meters": 4.1,
                "rainfall_last_24h_mm": 42.0,
                "wind_speed_kmh": 31.5,
                "visibility_meters": 1500.0,
                "include_ai_explanation": False
            }
        }
    }

class PredictResponse(BaseModel):
    risk_score: float = Field(
        ...,
        ge=0.0,
        le=100.0,
        description="Aggregated hydrodynamic danger index on an explainable 0 to 100 scale."
    )
    risk_level: str = Field(
        ...,
        description="Categorized safety risk level: 'low', 'moderate', 'high', or 'extreme'."
    )
    confidence: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Confidence coefficient (0.0 to 1.0) of the risk inference output."
    )
    primary_hazards: List[str] = Field(
        ...,
        description="List of primary environmental hazard factors detected from telemetry."
    )
    safety_recommendations: List[str] = Field(
        ...,
        description="Actionable public safety directives for recreationists and authorities."
    )
    model_version: str = Field(
        ...,
        description="Active model identifier (e.g. baseline-heuristic-v0.1 or trained ML pipeline version)."
    )
    is_baseline_model: bool = Field(
        ...,
        description="True if calculated using explainable heuristic baseline; False if executed by trained ML model."
    )
    ai_explanation: Optional[str] = Field(
        default=None,
        description="Plain-language advisory summary synthesized by Gemini AI, or null if unrequested/unconfigured."
    )

    model_config = {
        "json_schema_extra": {
            "example": {
                "risk_score": 78.4,
                "risk_level": "high",
                "confidence": 0.86,
                "primary_hazards": [
                    "Rapid Current / High Flow",
                    "Cold Water Shock Potential"
                ],
                "safety_recommendations": [
                    "Swimming and wading strongly discouraged.",
                    "Wear certified Personal Flotation Devices (PFD) near bank edges."
                ],
                "model_version": "baseline-heuristic-v0.1",
                "is_baseline_model": True,
                "ai_explanation": None
            }
        }
    }
