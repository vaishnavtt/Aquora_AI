from backend.app.schemas.health import HealthResponse
from backend.app.schemas.water_body import WaterBodySchema
from backend.app.schemas.prediction import PredictRequest, PredictResponse
from backend.app.schemas.dashboard import DashboardResponse, DashboardAlertSchema

__all__ = [
    "HealthResponse",
    "WaterBodySchema",
    "PredictRequest",
    "PredictResponse",
    "DashboardResponse",
    "DashboardAlertSchema",
]
