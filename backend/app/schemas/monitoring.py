from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, ConfigDict


class HazardEvaluationTrigger(BaseModel):
    trigger_type: str  # "STAGE_SURGE", "FLOW_RATE_BREACH", "RISK_SCORE_BREACH"
    observed_value: float
    threshold_value: float
    description: str


class HazardEvaluationResult(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    station_name: str
    evaluation_status: str  # "HAZARD_DETECTED", "NOMINAL", "TELEMETRY_UNAVAILABLE"
    is_live: bool
    observed_stage_m: Optional[float] = None
    stage_delta_m: Optional[float] = None
    observed_flow_cms: Optional[float] = None
    recalculated_risk_score: Optional[float] = None
    recalculated_risk_level: Optional[str] = None
    triggers_detected: List[HazardEvaluationTrigger] = []
    generated_alert_id: Optional[int] = None
    outbound_delivery_status: Optional[str] = None
    confirmed_by_provider: bool = False
    evaluated_at: datetime
    notice: str


class HazardMonitoringEvaluationRequest(BaseModel):
    station_query: Optional[str] = None  # Specific station or None for all monitored sites
    safe_simulation_only: bool = True  # Safe test mode: prevents unsolicited real alerts


class HazardMonitoringStatusResponse(BaseModel):
    is_scheduler_running: bool
    monitoring_interval_seconds: float
    safe_simulation_enforced: bool
    thresholds: Dict[str, float]
    monitored_stations: List[str]
    last_evaluation_timestamp: Optional[datetime] = None
    evaluations_count: int
    recent_evaluations: List[HazardEvaluationResult] = []
