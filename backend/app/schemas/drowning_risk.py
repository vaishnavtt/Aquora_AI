"""
AQUORA AI - Drowning Risk Assessment & What-If Simulation Schemas
Track: Machine Learning, API Architecture & Hydrological Integration
"""

from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class LayerAEnvironmentalHazard(BaseModel):
    hazard_score: float = Field(..., description="Environmental hazard score from 0.0 (minimal) to 100.0 (extreme)")
    hazard_level: str = Field(..., description="Environmental hazard level: low, moderate, high, or very_high")
    ml_hazard_probability: Optional[float] = Field(None, description="Calibrated probability from Scikit-Learn ML classifier (0.0 to 1.0)")
    ml_model_name: str = Field(..., description="ML model architecture used for hazard inference")
    is_model_calibrated: bool = Field(True, description="Whether probability output has undergone calibration")
    water_level_m: Optional[float] = Field(None, description="Water level stage height in metres")
    water_level_delta_1h_m: Optional[float] = Field(None, description="1-hour stage change (+/- metres)")
    water_level_delta_3h_m: Optional[float] = Field(None, description="3-hour stage change (+/- metres)")
    rainfall_1h_mm: Optional[float] = Field(None, description="1-hour rainfall accumulation in mm")
    rainfall_24h_mm: Optional[float] = Field(None, description="24-hour rainfall accumulation in mm")
    estimated_discharge_cms: Optional[float] = Field(None, description="River water discharge volume in m³/sec")
    is_monsoon_season: bool = Field(False, description="Whether active monsoon conditions apply")
    top_contributing_factors: List[str] = Field(default_factory=list, description="Primary environmental indicators driving the hazard score")


class LayerBContextualRisk(BaseModel):
    vulnerability_score: float = Field(..., description="Site-specific vulnerability score from 0.0 to 100.0")
    water_body_type: str = Field(..., description="Type of water body: river, quarry, waterfall, lake, reservoir, canal")
    water_body_type_label: str = Field(..., description="Display label for the water body type")
    site_vulnerability_profile: str = Field(..., description="Specific physical hazard profile (e.g. sheer drop-off, cold thermocline, slippery rocks)")
    exposure_risk_level: str = Field(..., description="Human exposure category: low, moderate, high, extreme")
    access_characteristics: str = Field(..., description="Physical enclosure / barrier status (e.g. unfenced, public access, regulated)")
    bathymetry_hazard_notes: str = Field(..., description="Underwater geometry characteristics (e.g. steep depth drop, submerged silt, undercurrent)")
    historical_mortality_context: str = Field(..., description="Verified regional historical context from official Kerala statistics (NCRB/Fire Force)")


class DrowningRiskAssessmentResponse(BaseModel):
    water_body_id: Optional[int] = Field(None, description="Water body database identifier if applicable")
    water_body_name: str = Field(..., description="Name of the water body or monitoring location")
    water_body_type: str = Field(..., description="Categorical type: river, quarry, waterfall, lake, reservoir, canal")
    latitude: float = Field(..., description="Geographic latitude in decimal degrees")
    longitude: float = Field(..., description="Geographic longitude in decimal degrees")
    district: Optional[str] = Field(None, description="Administrative district in Kerala")
    basin: Optional[str] = Field(None, description="River basin or hydrologic drainage zone")
    
    # Combined Two-Layer Assessment
    risk_category: str = Field(..., description="Overall risk category: LOW, MODERATE, HIGH, VERY HIGH")
    risk_score: float = Field(..., description="Integrated risk score from 0.0 to 100.0")
    assessment_method: str = Field(
        default="TWO_LAYER_PROVISIONAL_ASSESSMENT",
        description="Assessment methodology: TWO_LAYER_PROVISIONAL_ASSESSMENT"
    )
    is_learned_drowning_probability: bool = Field(
        default=False,
        description="Whether this represents a learned personal drowning probability (strictly False without micro-incident logs)"
    )
    scientific_disclaimer: str = Field(
        ...,
        description="Mandatory scientific and ethical notice distinguishing environmental danger from calibrated drowning probability"
    )

    # Detailed Sub-Layers
    layer_a_environmental_hazard: LayerAEnvironmentalHazard
    layer_b_contextual_risk: LayerBContextualRisk

    # Explanations and Recommendations
    primary_hazards: List[str] = Field(default_factory=list, description="All active physical and contextual hazard factors")
    safety_recommendations: List[str] = Field(default_factory=list, description="Actionable safety directives for the public and operators")
    data_freshness_status: str = Field(..., description="Data freshness: LIVE_STREAM, RECENT_TELEMETRY, HISTORICAL_BASELINE, or SYNTHETIC_SIMULATION")
    observation_timestamp: Optional[str] = Field(None, description="Timestamp of the most recent environmental observation")
    missing_variables: List[str] = Field(default_factory=list, description="List of unobserved telemetry variables with imputed assumptions")


class DrowningRiskAssessRequest(BaseModel):
    water_body_id: Optional[int] = Field(None, description="ID of existing water body to evaluate")
    water_body_type: Optional[str] = Field(None, description="Type: river, quarry, waterfall, lake, reservoir, canal")
    water_level_m: Optional[float] = Field(None, description="Current water stage in metres")
    water_level_delta_1h_m: Optional[float] = Field(None, description="1-hour stage delta in metres")
    water_level_delta_3h_m: Optional[float] = Field(None, description="3-hour stage delta in metres")
    rainfall_1h_mm: Optional[float] = Field(None, description="1-hour rainfall in mm")
    rainfall_24h_mm: Optional[float] = Field(None, description="24-hour rainfall in mm")
    discharge_cms: Optional[float] = Field(None, description="River discharge in m³/s")
    water_temp_c: Optional[float] = Field(None, description="Water temperature in °C")
    elevation_m: Optional[float] = Field(None, description="Terrain elevation in metres")
    is_monsoon_season: Optional[bool] = Field(None, description="Monsoon status flag")


class WhatIfSimulationRequest(BaseModel):
    water_body_id: Optional[int] = Field(None, description="Base water body ID to apply simulation against")
    water_body_type: Optional[str] = Field("river", description="Target water body type")
    simulated_rainfall_increment_mm: float = Field(0.0, description="Hypothetical additional rainfall in mm over 24h")
    simulated_stage_delta_m: float = Field(0.0, description="Hypothetical river water level surge/drop in metres")
    simulated_discharge_increment_cms: float = Field(0.0, description="Hypothetical additional discharge volume in m³/s")
    simulated_water_temp_c: Optional[float] = Field(None, description="Hypothetical water temperature in °C")
    simulated_exposure_scenario: Optional[str] = Field("normal", description="Exposure scenario: normal, weekend_crowd, night_time, unfenced")


class WhatIfSimulationResponse(BaseModel):
    is_hypothetical_simulation: bool = Field(True, description="Always True for simulation responses")
    simulation_notes: str = Field(..., description="Notice clarifying simulated nature of results")
    baseline_assessment: DrowningRiskAssessmentResponse
    simulated_assessment: DrowningRiskAssessmentResponse
    delta_risk_score: float = Field(..., description="Change in risk score (+/- points)")
    delta_risk_category: str = Field(..., description="Change in risk category (e.g. LOW -> HIGH)")
    newly_triggered_hazards: List[str] = Field(default_factory=list, description="Hazards triggered by hypothetical conditions")


class DatasetAuditItem(BaseModel):
    filename: str
    purpose: str
    status: str
    size_bytes: int
    row_count: int
    column_count: int
    date_range: Optional[List[Optional[str]]] = None
    station_count: int
    usable_for_training: bool
    rejection_reason: Optional[str] = None
    contribution_to_aquora: str


class ModelStatusResponse(BaseModel):
    model_version: str
    champion_model_name: str
    training_dataset_records: int
    validation_records: int
    out_of_time_test_records: int
    metrics_summary: Dict[str, Any]
    all_models_benchmarks: List[Dict[str, Any]]
    feature_importances: Dict[str, float]
    datasets_audit: List[DatasetAuditItem]
    incident_data_investigation_summary: str
    ethical_compliance_notice: str
    leak_free_antecedent_benchmark: Optional[Dict[str, Any]] = None
    spatial_generalization_benchmark: Optional[Dict[str, Any]] = None
    scientific_integrity_declaration: Optional[Dict[str, Any]] = None
