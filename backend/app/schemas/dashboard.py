from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict, Field

class DashboardAlertSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int = Field(..., description="Unique alert identifier")
    water_body_id: Optional[int] = Field(default=None, description="Referenced water body site ID")
    water_body_name: str = Field(..., description="Name of the affected aquatic zone")
    severity: str = Field(..., description="Alert severity: 'low', 'moderate', 'high', or 'extreme'")
    message: str = Field(..., description="Actionable advisory warning message")
    timestamp: datetime = Field(..., description="UTC timestamp when the safety advisory was triggered")

class DashboardResponse(BaseModel):
    total_monitored_sites: int = Field(..., ge=0, description="Total count of active monitoring stations")
    high_risk_sites_count: int = Field(..., ge=0, description="Total count of sites flagged as high or extreme risk")
    safe_sites_count: int = Field(..., ge=0, description="Total count of sites categorized as low risk")
    moderate_risk_sites_count: int = Field(..., ge=0, description="Total count of sites categorized as moderate risk")
    system_status: str = Field(..., description="Overall telemetry network state ('operational')")
    last_sync: datetime = Field(..., description="UTC timestamp of the latest telemetry aggregation cycle")
    recent_alerts: List[DashboardAlertSchema] = Field(default_factory=list, description="Chronological log of recent alerts")

    model_config = {
        "json_schema_extra": {
            "example": {
                "total_monitored_sites": 6,
                "high_risk_sites_count": 1,
                "safe_sites_count": 4,
                "moderate_risk_sites_count": 1,
                "system_status": "operational",
                "last_sync": "2026-10-14T18:00:00Z",
                "recent_alerts": [
                    {
                        "id": 101,
                        "water_body_id": 2,
                        "water_body_name": "Cascade Canyon River",
                        "severity": "high",
                        "message": "Water flow velocity elevated past safe threshold (9.4 m³/s).",
                        "timestamp": "2026-10-14T17:45:00Z"
                    }
                ]
            }
        }
    }
