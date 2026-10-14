from datetime import datetime
from pydantic import BaseModel, ConfigDict

class WaterBodySchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    type: str # lake, river, reservoir, coastal
    latitude: float
    longitude: float
    current_risk_level: str # low, moderate, high, extreme
    risk_score: float
    water_temp_c: float
    flow_rate_cms: float
    depth_meters: float
    last_updated: datetime
