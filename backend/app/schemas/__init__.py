try:
    from app.schemas.common import (
        RiskLevelEnum,
        WaterBodyTypeEnum,
        ErrorResponse,
        ErrorDetailItem,
    )
    from app.schemas.health import HealthResponse
    from app.schemas.water_body import WaterBodySchema
    from app.schemas.prediction import PredictRequest, PredictResponse
    from app.schemas.dashboard import DashboardResponse, DashboardAlertSchema
    from app.schemas.forecast import (
        HourlyReadingSchema,
        WaterLevelForecastRequest,
        WaterLevelForecastResponse,
    )
    from app.schemas.river_data import (
        RiverDataResponse,
        LatestHistoricalReading,
    )
    from app.schemas.alert import (
        AlertDispatchRequest,
        AlertTestRequest,
        AlertDispatchResponse,
        AlertDeliverySchema,
        AlertChannelStatusResponse,
    )
except ImportError:
    from backend.app.schemas.common import (
        RiskLevelEnum,
        WaterBodyTypeEnum,
        ErrorResponse,
        ErrorDetailItem,
    )
    from backend.app.schemas.health import HealthResponse
    from backend.app.schemas.water_body import WaterBodySchema
    from backend.app.schemas.prediction import PredictRequest, PredictResponse
    from backend.app.schemas.dashboard import DashboardResponse, DashboardAlertSchema
    from backend.app.schemas.forecast import (
        HourlyReadingSchema,
        WaterLevelForecastRequest,
        WaterLevelForecastResponse,
    )
    from backend.app.schemas.river_data import (
        RiverDataResponse,
        LatestHistoricalReading,
    )
    from backend.app.schemas.alert import (
        AlertDispatchRequest,
        AlertTestRequest,
        AlertDispatchResponse,
        AlertDeliverySchema,
        AlertChannelStatusResponse,
    )

__all__ = [
    "RiskLevelEnum",
    "WaterBodyTypeEnum",
    "ErrorResponse",
    "ErrorDetailItem",
    "HealthResponse",
    "WaterBodySchema",
    "PredictRequest",
    "PredictResponse",
    "DashboardResponse",
    "DashboardAlertSchema",
    "HourlyReadingSchema",
    "WaterLevelForecastRequest",
    "WaterLevelForecastResponse",
    "RiverDataResponse",
    "LatestHistoricalReading",
    "AlertDispatchRequest",
    "AlertTestRequest",
    "AlertDispatchResponse",
    "AlertDeliverySchema",
    "AlertChannelStatusResponse",
]
