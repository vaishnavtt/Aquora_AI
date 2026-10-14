from datetime import datetime
from pydantic import BaseModel, ConfigDict

class DashboardAlertSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    water_body_id: int | None
    water_body_name: str
    severity: str
    message: str
    timestamp: datetime

class DashboardResponse(BaseModel):
    total_monitored_sites: int
    high_risk_sites_count: int
    safe_sites_count: int
    moderate_risk_sites_count: int
    system_status: str
    last_sync: datetime
    recent_alerts: list[DashboardAlertSchema]
