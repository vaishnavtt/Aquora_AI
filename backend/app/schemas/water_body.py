from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field
try:
    from app.schemas.common import RiskLevelEnum, WaterBodyTypeEnum
except ImportError:
    from backend.app.schemas.common import RiskLevelEnum, WaterBodyTypeEnum

class WaterBodySchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int = Field(..., description="Unique water body identifier")
    name: str = Field(..., description="Display name of the water body station")
    type: str = Field(..., description="Category: lake, river, reservoir, or coastal")
    latitude: float = Field(..., description="Geographic latitude coordinate")
    longitude: float = Field(..., description="Geographic longitude coordinate")
    current_risk_level: str = Field(..., description="Current evaluated risk level (low, moderate, high, extreme)")
    risk_score: float = Field(..., ge=0.0, le=100.0, description="Composite hydrodynamic risk score (0-100)")
    water_temp_c: float = Field(..., description="Water temperature in degrees Celsius")
    flow_rate_cms: float = Field(..., description="Volumetric flow velocity in cubic meters per second (m³/s)")
    depth_meters: float = Field(..., description="Effective water depth in meters")
    last_updated: datetime = Field(..., description="UTC timestamp of the latest telemetry sync")
    description: Optional[str] = Field(default=None, description="Descriptive station telemetry summary")
    is_demonstration_data: bool = Field(default=True, description="Flag explicitly designating synthetic prototype data")
