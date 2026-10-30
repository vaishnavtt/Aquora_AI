"""
AQUORA AI - Authority Inspection Prioritization Schemas
Track: Environmental Decision Support & Risk-Informed Site Prioritization
"""

from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class SiteInspectionPriorityItem(BaseModel):
    water_body_id: int = Field(..., description="Unique water body identifier")
    location_name: str = Field(..., description="Display name of the aquatic location")
    water_body_type: str = Field(..., description="Categorical type: river, quarry, waterfall, lake, reservoir, canal")
    district: str = Field("Kerala", description="Administrative district in Kerala")
    latitude: float = Field(..., description="Geographic latitude coordinate")
    longitude: float = Field(..., description="Geographic longitude coordinate")

    # Environmental Hazard & Contextual Risk
    environmental_hazard_score: float = Field(..., ge=0.0, le=100.0, description="Layer A Environmental Hazard Score (0-100)")
    environmental_hazard_category: str = Field(..., description="Hazard level: LOW, MODERATE, HIGH, VERY HIGH")
    composite_risk_score: float = Field(..., ge=0.0, le=100.0, description="Composite two-layer danger index (0-100)")
    composite_risk_level: str = Field(..., description="Risk category: low, moderate, high, extreme")

    # Contributing Factors & Telemetry Context
    top_contributing_factors: List[str] = Field(default_factory=list, description="Primary environmental and contextual hazard drivers")
    data_freshness_status: str = Field(..., description="Data provenance: LIVE_STREAM, RECENT_TELEMETRY, HISTORICAL_BASELINE, or SYNTHETIC_SIMULATION")
    relevant_limitations: List[str] = Field(default_factory=list, description="Explicit limitations and unobserved parameters for this site")
    nearest_telemetry_station: Optional[str] = Field(None, description="Name of nearest reference river telemetry station")
    telemetry_distance_km: Optional[float] = Field(None, description="Distance in kilometres to nearest reference river telemetry station")

    # Inspection Prioritization
    inspection_priority: str = Field(..., description="Prioritization category: CRITICAL, HIGH, MEDIUM, ROUTINE")
    priority_rank_score: float = Field(..., ge=0.0, le=100.0, description="Quantitative priority score for sorting inspection queues (0-100)")
    priority_explanation: str = Field(..., description="Transparent, plain-language justification for why this priority tier was assigned")
    last_inspection_date: Optional[str] = Field(
        None,
        description="Date of last official statutory inspection, or None if no reliable government inspection record is on file"
    )
    suggested_inspection_focus: List[str] = Field(
        default_factory=list,
        description="Recommended on-site safety checks (e.g. barrier fencing, warning signage, lifebuoy availability)"
    )


class InspectionPrioritizationResponse(BaseModel):
    generated_at: datetime = Field(..., description="UTC timestamp of the prioritization calculation")
    total_sites_evaluated: int = Field(..., description="Total count of monitored water bodies evaluated")
    critical_count: int = Field(0, description="Sites requiring urgent safety audit")
    high_count: int = Field(0, description="Sites requiring elevated inspection attention")
    medium_count: int = Field(0, description="Sites requiring standard scheduled inspection")
    routine_count: int = Field(0, description="Sites requiring routine monitoring")
    prioritized_sites: List[SiteInspectionPriorityItem] = Field(..., description="Ranked list of aquatic sites sorted by priority")
    priority_scoring_methodology: str = Field(
        ...,
        description="Documentation of the prioritization heuristic incorporating hazard level, site typology, and unobserved data uncertainty"
    )
    disclaimer: str = Field(
        ...,
        description="Mandatory advisory notice: Automated decision-support guidance; does not constitute a statutory regulatory mandate"
    )


class InspectionCreateRequest(BaseModel):
    water_body_id: int = Field(..., description="ID of the water body to inspect")
    inspector_name: Optional[str] = Field(None, description="Name or badge ID of assigned inspector")
    scheduled_date: Optional[datetime] = Field(None, description="Scheduled inspection timestamp")
    findings_notes: Optional[str] = Field(None, description="Initial assignment notes or objective")
    suggested_focus: Optional[List[str]] = Field(default_factory=list, description="Specific safety items to audit")


class InspectionUpdateRequest(BaseModel):
    status: Optional[str] = Field(None, description="Status: SCHEDULED, IN_PROGRESS, COMPLETED, CANCELLED")
    inspector_name: Optional[str] = Field(None, description="Name of inspector")
    findings_notes: Optional[str] = Field(None, description="On-site inspector findings and observations")
    safety_measures_verified: Optional[List[str]] = Field(None, description="Checklist of verified safety measures")
    action_required: Optional[bool] = Field(None, description="Flag indicating urgent municipal remediation needed")
    completed_date: Optional[datetime] = Field(None, description="Timestamp when inspection was completed")


class InspectionRecordResponse(BaseModel):
    id: int
    water_body_id: int
    water_body_name: str
    water_body_type: str
    district: str
    priority_tier: str
    priority_rank_score: float
    status: str
    inspector_name: Optional[str] = None
    scheduled_date: Optional[datetime] = None
    completed_date: Optional[datetime] = None
    environmental_hazard_score: Optional[float] = None
    composite_risk_score: Optional[float] = None
    contributing_factors: List[str] = Field(default_factory=list)
    suggested_focus: List[str] = Field(default_factory=list)
    safety_measures_verified: List[str] = Field(default_factory=list)
    findings_notes: Optional[str] = None
    action_required: bool = False
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class InspectionListResponse(BaseModel):
    total: int
    scheduled_count: int
    in_progress_count: int
    completed_count: int
    cancelled_count: int
    action_required_count: int
    inspections: List[InspectionRecordResponse]


class InspectionTrendItem(BaseModel):
    period: str
    total_inspections: int
    completed_count: int
    action_required_count: int
    avg_priority_score: float


class InspectionTrendsResponse(BaseModel):
    has_sufficient_history: bool
    total_records: int
    minimum_required_records: int = 5
    summary: str
    trends: List[InspectionTrendItem] = Field(default_factory=list)

