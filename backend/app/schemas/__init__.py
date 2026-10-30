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
    from app.schemas.dashboard import DashboardResponse, DashboardAlertSchema, StationAvailabilitySchema
    from app.schemas.forecast import (
        HourlyReadingSchema,
        WaterLevelForecastRequest,
        WaterLevelForecastResponse,
    )
    from app.schemas.river_data import (
        RiverDataResponse,
        LatestHistoricalReading,
        HistoricalReadingPoint,
        HistoricalSeriesResponse,
        ForecastObservationComparisonPoint,
        ForecastVsObservationResponse,
    )
    from app.schemas.alert import (
        AlertDispatchRequest,
        AlertTestRequest,
        AlertDispatchResponse,
        AlertDeliverySchema,
        AlertChannelStatusResponse,
    )
    from app.schemas.environmental import (
        DimensionAudit,
        EnvironmentalPipelineAuditResponse,
    )
    from app.schemas.monitoring import (
        HazardEvaluationTrigger,
        HazardEvaluationResult,
        HazardMonitoringEvaluationRequest,
        HazardMonitoringStatusResponse,
    )
    from app.schemas.inspection import (
        SiteInspectionPriorityItem,
        InspectionPrioritizationResponse,
        InspectionCreateRequest,
        InspectionUpdateRequest,
        InspectionRecordResponse,
        InspectionListResponse,
        InspectionTrendItem,
        InspectionTrendsResponse,
    )
    from app.schemas.auth import (
        UserRole,
        UserResponse,
        LoginRequest,
        TokenResponse,
        UserCreateRequest,
        UserUpdateRequest,
        PasswordChangeRequest,
    )
    from app.schemas.waterbody_gis import (
        GeoJSONGeometry,
        WaterbodyFeatureSchema,
        WaterbodyViewportResponse,
        HazardAssessmentResponse,
        WaterbodyStatsResponse,
        WaterbodySearchResponse,
        WaterbodyObservationItem,
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
    from backend.app.schemas.dashboard import DashboardResponse, DashboardAlertSchema, StationAvailabilitySchema
    from backend.app.schemas.forecast import (
        HourlyReadingSchema,
        WaterLevelForecastRequest,
        WaterLevelForecastResponse,
    )
    from backend.app.schemas.river_data import (
        RiverDataResponse,
        LatestHistoricalReading,
        HistoricalReadingPoint,
        HistoricalSeriesResponse,
        ForecastObservationComparisonPoint,
        ForecastVsObservationResponse,
    )
    from backend.app.schemas.alert import (
        AlertDispatchRequest,
        AlertTestRequest,
        AlertDispatchResponse,
        AlertDeliverySchema,
        AlertChannelStatusResponse,
    )
    from backend.app.schemas.environmental import (
        DimensionAudit,
        EnvironmentalPipelineAuditResponse,
    )
    from backend.app.schemas.monitoring import (
        HazardEvaluationTrigger,
        HazardEvaluationResult,
        HazardMonitoringEvaluationRequest,
        HazardMonitoringStatusResponse,
    )
    from backend.app.schemas.inspection import (
        SiteInspectionPriorityItem,
        InspectionPrioritizationResponse,
        InspectionCreateRequest,
        InspectionUpdateRequest,
        InspectionRecordResponse,
        InspectionListResponse,
        InspectionTrendItem,
        InspectionTrendsResponse,
    )
    from backend.app.schemas.auth import (
        UserRole,
        UserResponse,
        LoginRequest,
        TokenResponse,
        UserCreateRequest,
        UserUpdateRequest,
        PasswordChangeRequest,
    )
    from backend.app.schemas.waterbody_gis import (
        GeoJSONGeometry,
        WaterbodyFeatureSchema,
        WaterbodyViewportResponse,
        HazardAssessmentResponse,
        WaterbodyStatsResponse,
        WaterbodySearchResponse,
        WaterbodyObservationItem,
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
    "StationAvailabilitySchema",
    "HourlyReadingSchema",
    "WaterLevelForecastRequest",
    "WaterLevelForecastResponse",
    "RiverDataResponse",
    "LatestHistoricalReading",
    "HistoricalReadingPoint",
    "HistoricalSeriesResponse",
    "ForecastObservationComparisonPoint",
    "ForecastVsObservationResponse",
    "AlertDispatchRequest",
    "AlertTestRequest",
    "AlertDispatchResponse",
    "AlertDeliverySchema",
    "AlertChannelStatusResponse",
    "DimensionAudit",
    "EnvironmentalPipelineAuditResponse",
    "HazardEvaluationTrigger",
    "HazardEvaluationResult",
    "HazardMonitoringEvaluationRequest",
    "HazardMonitoringStatusResponse",
    "SiteInspectionPriorityItem",
    "InspectionPrioritizationResponse",
    "InspectionCreateRequest",
    "InspectionUpdateRequest",
    "InspectionRecordResponse",
    "InspectionListResponse",
    "InspectionTrendItem",
    "InspectionTrendsResponse",
    "GeoJSONGeometry",
    "WaterbodyFeatureSchema",
    "WaterbodyViewportResponse",
    "HazardAssessmentResponse",
    "WaterbodyStatsResponse",
    "WaterbodySearchResponse",
    "WaterbodyObservationItem",
    "UserRole",
    "UserResponse",
    "LoginRequest",
    "TokenResponse",
    "UserCreateRequest",
    "UserUpdateRequest",
    "PasswordChangeRequest",
]

