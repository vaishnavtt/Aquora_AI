// API Contract Data Types matching docs/api-contract.md

export type RiskLevel = 'low' | 'moderate' | 'high' | 'extreme';
export type RiskCategory = 'LOW' | 'MODERATE' | 'HIGH' | 'VERY HIGH';
export type WaterBodyType =
  | 'river'
  | 'reservoir'
  | 'lake'
  | 'waterfall'
  | 'canal'
  | 'coastal'
  | 'quarry'
  | 'pond';

export interface HealthResponse {
  status: string;
  timestamp: string;
  version: string;
  database: string;
  ml_model_loaded: boolean;
}

export interface WaterBody {
  id: number;
  name: string;
  type: WaterBodyType;
  latitude: number;
  longitude: number;
  elevation_m?: number | null;
  elevation_meters?: number | null;
  current_water_level_m?: number | null;
  normal_water_level_m?: number | null;
  danger_water_level_m?: number | null;
  flow_velocity_mps?: number | null;
  discharge_cms?: number | null;
  water_temp_c: number;
  current_risk_level: RiskLevel;
  current_risk_score?: number | null;
  is_demonstration_data: boolean;

  risk_score: number;
  flow_rate_cms: number;
  depth_meters: number;
  last_updated: string;
  basin_region?: string | null;
  data_source?: string | null;
  description?: string | null;

  // Operational telemetry metadata
  station_id?: string;
  station_code?: string;
  last_verified?: string;
  rainfall_rate_mmh?: number;
  rainfall_intensity?: string;
  humidity_pct?: number;
  wind_kmh?: number;
  sensor_array?: string;
  model_confidence?: number;
  env_hazard_score?: number;
  hydrodynamic_score?: number;
  primary_hazards?: string[];
  recommended_actions?: string[];
  stage_surge_rate?: string;
  review_state?: string;
}


export interface PredictRequest {
  water_body_id?: number | null;
  water_temp_c: number;
  flow_rate_cms: number;
  depth_meters: number;
  rainfall_last_24h_mm: number;
  wind_speed_kmh: number;
  visibility_meters: number;
  include_ai_explanation?: boolean;
}

export interface PredictResponse {
  risk_score: number;
  risk_level: RiskLevel;
  confidence: number;
  primary_hazards: string[];
  safety_recommendations: string[];
  model_version: string;
  is_baseline_model: boolean;
  ai_explanation?: string | null;
}

export interface DashboardAlert {
  id: number;
  water_body_id: number;
  water_body_name: string;
  severity: RiskLevel;
  message: string;
  timestamp: string;
}

export interface StationAvailability {
  station_name: string;
  station_type: string;
  telemetry_status: string;
  data_source: string;
  freshness: string;
  is_live: boolean;
}

export interface DashboardResponse {
  total_monitored_sites: number;
  high_risk_sites_count: number;
  safe_sites_count: number;
  moderate_risk_sites_count: number;
  system_status: string;
  last_sync: string;
  recent_alerts: DashboardAlert[];
  station_availability?: StationAvailability[];
}

// Experimental River Water-Level Forecasting Types
export interface HourlyReading {
  timestamp: string;
  water_level_m: number;
}

export interface WaterLevelForecastRequest {
  station_name: string;
  readings: HourlyReading[];
}

export interface WaterLevelForecastResponse {
  station: string;
  district: string;
  forecast_horizon: string;
  latest_observation_timestamp: string;
  forecast_target_timestamp: string;
  current_water_level_m: number;
  persistence_baseline_m: number;
  predicted_delta_m: number;
  forecasted_water_level_m: number;
  rate_of_change_trend: 'rising' | 'falling' | 'steady';
  model_type: string;
  is_experimental: boolean;
  notice: string;
}

// Government River Telemetry Types
export interface LatestHistoricalReading {
  timestamp: string;
  water_level_m: number;
  description: string;
}

export type RiverDataStatus = 'LIVE' | 'CACHED' | 'HISTORICAL' | 'UNAVAILABLE';

export interface RiverDataResponse {
  station_name: string;
  district: string;
  status: RiverDataStatus;
  water_level_m?: number | null;
  flow_rate_cms?: number | null;
  observation_timestamp?: string | null;
  retrieval_timestamp?: string | null;
  monitoring_station_distance_km?: number | null;
  is_live: boolean;
  is_cached: boolean;
  data_source: string;
  data_freshness: string;
  notice: string;
  access_requirements?: string | null;
  latest_historical_reading?: LatestHistoricalReading | null;
}

// UI-Specific Demonstration & Visualization Types
export interface RiskChangeEvent {
  id: string;
  water_body_id: number;
  water_body_name: string;
  previous_level: RiskLevel;
  new_level: RiskLevel;
  previous_score: number;
  new_score: number;
  trigger_reason: string;
  timestamp: string;
  delta_direction: 'increased' | 'decreased' | 'stable';
}

export interface TrendDataPoint {
  timeLabel: string;
  timestamp: string;
  riskScore: number;
  flowRate: number;
  rainfall: number;
  isForecast?: boolean;
}

// Outbound Alert Dispatch & Emergency Notification Types
export type AlertDeliveryStatus =
  | 'DELIVERED'
  | 'ACCEPTED'
  | 'FAILED'
  | 'TEST_MODE_SIMULATED'
  | 'UNCONFIGURED'
  | 'DUPLICATE_SUPPRESSED';

export interface AlertDispatchRequest {
  water_body_id?: number | null;
  water_body_name: string;
  severity: string;
  message: string;
  channel: 'webhook' | 'email' | 'sms';
  recipient?: string | null;
  test_mode?: boolean;
  force?: boolean;
}

export interface AlertTestRequest {
  channel: 'webhook' | 'email' | 'sms';
  recipient?: string | null;
  water_body_name?: string;
  safe_simulation_only?: boolean;
}

export interface AlertDispatchResponse {
  delivery_id: string;
  channel: string;
  recipient: string;
  severity: string;
  status: AlertDeliveryStatus;
  confirmed_by_provider: boolean;
  provider_message: string;
  dispatched_at: string;
  test_mode: boolean;
  notice: string;
}

export interface AlertDelivery {
  id: string;
  alert_id?: number | null;
  water_body_id?: number | null;
  water_body_name: string;
  severity: string;
  channel: string;
  recipient: string;
  message: string;
  status: AlertDeliveryStatus;
  confirmed_by_provider: boolean;
  provider_message: string;
  is_test_mode: boolean;
  created_at: string;
}

export interface AlertChannelStatus {
  webhook_configured: boolean;
  email_configured: boolean;
  sms_configured?: boolean;
  default_webhook_url?: string | null;
  default_email_recipient?: string | null;
  default_sms_recipient?: string | null;
  test_mode_enforced: boolean;
  dedup_window_seconds?: number;
  notice: string;
}

// Environmental Data Pipeline Audit Types
export interface DimensionAudit {
  dimension: string;
  status: 'AVAILABLE_LIVE' | 'AVAILABLE_HISTORICAL' | 'AVAILABLE_STATIC' | 'UNAVAILABLE';
  value?: any;
  units?: string | null;
  source?: string | null;
  observation_timestamp?: string | null;
  retrieval_timestamp?: string | null;
  limitation_reason?: string | null;
}

export interface EnvironmentalPipelineAuditResponse {
  station_id?: number | null;
  station_name: string;
  water_body_type: string;
  basin_region?: string | null;
  latitude: number;
  longitude: number;
  audit_timestamp: string;
  data_freshness: string;
  nearest_telemetry_station?: string | null;
  monitoring_station_distance_km?: number | null;
  dimensions: Record<string, DimensionAudit>;
  available_dimensions_count: number;
  unavailable_dimensions_count: number;
  ethical_data_notice: string;
}

// Historical Telemetry Series Types
export interface HistoricalReadingPoint {
  timestamp: string;
  water_level_m: number;
  flow_rate_cms?: number | null;
  source: string;
}

export interface HistoricalSeriesResponse {
  station_name: string;
  district: string;
  status: string;
  data_source: string;
  total_records: number;
  readings: HistoricalReadingPoint[];
  notice: string;
}

// Forecast vs Observation Comparison Types
export interface ForecastObservationComparisonPoint {
  target_timestamp: string;
  water_level_t: number;
  forecasted_water_level_1h: number;
  actual_water_level_1h: number;
  absolute_error_m: number;
  baseline_persistence_error_m: number;
  model_beat_persistence: boolean;
}

export interface ForecastVsObservationResponse {
  station_name: string;
  model_name: string;
  evaluation_dataset: string;
  comparisons: ForecastObservationComparisonPoint[];
  model_mae_m: number;
  baseline_persistence_mae_m: number;
  mae_reduction_percent: number;
  disclaimer: string;
}

// Automated Hazard Monitoring Types
export interface HazardEvaluationTrigger {
  trigger_type: string;
  observed_value: number;
  threshold_value: number;
  description: string;
}

export interface HazardEvaluationResult {
  station_name: string;
  evaluation_status: 'HAZARD_DETECTED' | 'NOMINAL' | 'TELEMETRY_UNAVAILABLE';
  is_live: boolean;
  observed_stage_m?: number | null;
  stage_delta_m?: number | null;
  observed_flow_cms?: number | null;
  recalculated_risk_score?: number | null;
  recalculated_risk_level?: RiskLevel | null;
  triggers_detected: HazardEvaluationTrigger[];
  generated_alert_id?: number | null;
  outbound_delivery_status?: string | null;
  confirmed_by_provider: boolean;
  evaluated_at: string;
  notice: string;
}

export interface HazardMonitoringEvaluationRequest {
  station_query?: string | null;
  safe_simulation_only?: boolean;
}

export interface HazardMonitoringStatusResponse {
  is_scheduler_running: boolean;
  monitoring_interval_seconds: number;
  safe_simulation_enforced: boolean;
  thresholds: Record<string, number>;
  monitored_stations: string[];
  last_evaluation_timestamp?: string | null;
  evaluations_count: number;
  recent_evaluations: HazardEvaluationResult[];
}

export function formatCoordinates(lat: number, lng: number, digits: number = 4): string {
  const latDir = lat >= 0 ? 'N' : 'S';
  const lngDir = lng >= 0 ? 'E' : 'W';
  return `${Math.abs(lat).toFixed(digits)}Â°${latDir}, ${Math.abs(lng).toFixed(digits)}Â°${lngDir}`;
}

// Two-Layer Drowning Risk Assessment Types
export interface LayerAEnvironmentalHazard {
  hazard_score: number;
  hazard_level: string;
  ml_hazard_probability?: number | null;
  ml_model_name: string;
  is_model_calibrated: boolean;
  water_level_m?: number | null;
  water_level_delta_1h_m?: number | null;
  water_level_delta_3h_m?: number | null;
  rainfall_1h_mm?: number | null;
  rainfall_24h_mm?: number | null;
  estimated_discharge_cms?: number | null;
  is_monsoon_season: boolean;
  top_contributing_factors: string[];
}

export interface LayerBContextualRisk {
  vulnerability_score: number;
  water_body_type: string;
  water_body_type_label: string;
  site_vulnerability_profile: string;
  exposure_risk_level: string;
  access_characteristics: string;
  bathymetry_hazard_notes: string;
  historical_mortality_context: string;
}

export interface DrowningRiskAssessment {
  water_body_id?: number | null;
  water_body_name: string;
  water_body_type: WaterBodyType;
  latitude: number;
  longitude: number;
  district?: string | null;
  basin?: string | null;
  risk_category: RiskCategory;
  risk_score: number;
  assessment_method: string;
  is_learned_drowning_probability: boolean;
  scientific_disclaimer: string;
  layer_a_environmental_hazard: LayerAEnvironmentalHazard;
  layer_b_contextual_risk: LayerBContextualRisk;
  primary_hazards: string[];
  safety_recommendations: string[];
  data_freshness_status: string;
  observation_timestamp?: string | null;
  retrieval_timestamp?: string | null;
  data_source?: string;
  nearest_telemetry_station?: string | null;
  monitoring_station_distance_km?: number | null;
  missing_variables: string[];
}

export interface WhatIfSimulationRequest {
  water_body_id?: number | null;
  water_body_type?: string;
  simulated_rainfall_increment_mm: number;
  simulated_stage_delta_m: number;
  simulated_discharge_increment_cms: number;
  simulated_water_temp_c?: number | null;
  simulated_exposure_scenario?: string;
}

export interface WhatIfSimulationResponse {
  is_hypothetical_simulation: boolean;
  simulation_notes: string;
  baseline_assessment: DrowningRiskAssessment;
  simulated_assessment: DrowningRiskAssessment;
  delta_risk_score: number;
  delta_risk_category: string;
  newly_triggered_hazards: string[];
}

export interface DatasetAuditItem {
  filename: string;
  purpose: string;
  status: string;
  size_bytes: number;
  row_count: number;
  column_count: number;
  date_range?: (string | null)[] | null;
  station_count: number;
  usable_for_training: boolean;
  rejection_reason?: string | null;
  contribution_to_aquora: string;
}

export interface ModelStatusResponse {
  model_version: string;
  champion_model_name: string;
  training_dataset_records: number;
  validation_records: number;
  out_of_time_test_records: number;
  metrics_summary: Record<string, any>;
  all_models_benchmarks: any[];
  feature_importances: Record<string, number>;
  datasets_audit: DatasetAuditItem[];
  incident_data_investigation_summary: string;
  ethical_compliance_notice: string;
  leak_free_antecedent_benchmark?: {
    methodology: string;
    features_used: string[];
    uncalibrated_test_metrics: Record<string, any>;
    calibrated_test_metrics: Record<string, any>;
  } | null;
  spatial_generalization_benchmark?: {
    methodology: string;
    station_evaluations: Array<{
      station: string;
      sample_count: number;
      positive_rate: number;
      accuracy: number;
      f1_score: number;
      roc_auc: number;
      pr_auc: number;
      brier_score: number;
    }>;
  } | null;
  scientific_integrity_declaration?: {
    model_classification: string;
    target_nature: string;
    drowning_incident_status: string;
  } | null;
}

export interface LiveHourlyPrecipitation {
  time: string;
  precipitation_mm: number;
  temperature_c?: number | null;
}

export interface LiveWeatherResponse {
  water_body_id?: number | null;
  water_body_name?: string | null;
  latitude: number;
  longitude: number;
  current_temperature_c: number;
  current_precipitation_mm_h: number;
  weather_condition: string;
  wind_speed_kmh: number;
  accumulated_24h_rainfall_mm: number;
  forecast_24h_rainfall_mm: number;
  elevation_m?: number | null;
  hourly_forecast: LiveHourlyPrecipitation[];
  is_live_data: boolean;
  data_source: string;
  fetched_at: string;
  observation_timestamp?: string | null;
  retrieval_timestamp?: string | null;
  disclaimer: string;
}

// Location-Aware River Discovery Types
export interface NearbyRiverItem {
  id?: number | null;
  name: string;
  type: string;
  latitude: number;
  longitude: number;
  distance_km: number;
  distance_meters: number;
  distance_formatted: string;
  district?: string | null;
  basin_region?: string | null;
  is_monitored_station: boolean;
  has_prediction: boolean;
  current_risk_level?: RiskLevel | 'no_prediction' | null;
  risk_category?: RiskCategory | 'NO_PREDICTION' | null;
  risk_score?: number | null;
  data_source?: string | null;
  last_updated?: string | null;
  description?: string | null;
  assessment_scope?: string | null;
}

export interface NearbyRiversResponse {
  center_latitude: number;
  center_longitude: number;
  radius_km: number;
  total_found: number;
  monitored_count: number;
  unmonitored_osm_count: number;
  rivers: NearbyRiverItem[];
  disclaimer: string;
}

export interface RiverSearchResponse {
  query: string;
  total_found: number;
  results: NearbyRiverItem[];
}

export interface RiskClassificationRuleResponse {
  scale: string;
  thresholds: Record<string, {
    min: number | null;
    max_exclusive?: number;
    max_inclusive?: number;
    label: string;
    hex: string;
  }>;
  scientific_disclaimer: string;
}

// Authority Inspection Prioritization Types
export type InspectionPriorityTier = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'ROUTINE';

export interface SiteInspectionPriorityItem {
  water_body_id: number;
  location_name: string;
  water_body_type: string;
  district: string;
  latitude: number;
  longitude: number;
  environmental_hazard_score: number;
  environmental_hazard_category: string;
  composite_risk_score: number;
  composite_risk_level: string;
  top_contributing_factors: string[];
  data_freshness_status: string;
  relevant_limitations: string[];
  nearest_telemetry_station?: string | null;
  telemetry_distance_km?: number | null;
  inspection_priority: InspectionPriorityTier;
  priority_rank_score: number;
  priority_explanation: string;
  last_inspection_date?: string | null;
  suggested_inspection_focus: string[];
}

export interface InspectionPrioritizationResponse {
  generated_at: string;
  total_sites_evaluated: number;
  critical_count: number;
  high_count: number;
  medium_count: number;
  routine_count: number;
  prioritized_sites: SiteInspectionPriorityItem[];
  priority_scoring_methodology: string;
  disclaimer: string;
}

// Kerala-Wide Waterbody Geospatial & Transparent Hazard Assessment Types
export type HazardCategoryType =
  | 'HIGH_HAZARD'
  | 'MODERATE_HAZARD'
  | 'LOW_OBSERVED_HAZARD'
  | 'INSUFFICIENT_DATA'
  | 'STALE_DATA';

export interface WaterbodyFeature {
  id: number;
  external_id: string;
  name: string;
  type: string;
  geometry_type: string;
  geometry: {
    type: string;
    coordinates: any;
  };
  district?: string | null;
  basin_region?: string | null;
  centroid_lat: number;
  centroid_lon: number;
  bbox: [number, number, number, number];
  length_km?: number | null;
  area_sqkm?: number | null;
  data_source: string;
  license: string;
  data_quality: string;
  is_monitored_station: boolean;
  hazard_category: HazardCategoryType;
  contributing_indicators: string[];
  missing_factors: string[];
  rule_summary?: string | null;
  description?: string | null;
  last_assessed?: string | null;
  disclaimer: string;
}

export interface ContributingIndicatorDetail {
  indicator: string;
  value: number;
  unit: string;
  severity: 'HIGH' | 'MODERATE' | 'LOW';
  source: string;
  observed_at: string;
  description: string;
}

export interface HazardAssessmentResult {
  waterbody_id: number;
  external_id: string;
  waterbody_name: string;
  type: string;
  district?: string | null;
  hazard_category: HazardCategoryType;
  hazard_badge_color: string;
  contributing_indicators: ContributingIndicatorDetail[];
  missing_factors: string[];
  stale_factors: string[];
  evaluation_rules_applied: string[];
  rule_summary: string;
  assessment_timestamp: string;
  data_source: string;
  license: string;
  physical_limitations: string;
  scientific_disclaimer: string;
}

export interface WaterbodyViewportResponse {
  total_features: number;
  returned_features: number;
  bbox: [number, number, number, number];
  features: WaterbodyFeature[];
  dataset_attribution: string;
  coverage_notes: string;
}

export interface WaterbodyStatsResponse {
  total_waterbodies: number;
  counts_by_type: Record<string, number>;
  counts_by_district: Record<string, number>;
  counts_by_hazard_category: Record<string, number>;
  counts_by_geometry_type: Record<string, number>;
  data_sources: string[];
  known_omissions_and_gaps: string[];
  last_ingestion_date?: string | null;
}



