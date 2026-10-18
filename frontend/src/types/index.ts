// API Contract Data Types matching docs/api-contract.md

export type RiskLevel = 'low' | 'moderate' | 'high' | 'extreme';
export type WaterBodyType = 'lake' | 'river' | 'reservoir' | 'coastal';

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
  current_risk_level: RiskLevel;
  risk_score: number;
  water_temp_c: number;
  flow_rate_cms: number;
  depth_meters: number;
  elevation_meters?: number | null;
  basin_region?: string | null;
  data_source?: string | null;
  last_updated: string;
  description?: string;
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
  channel: 'webhook' | 'email';
  recipient?: string | null;
  test_mode?: boolean;
  force?: boolean;
}

export interface AlertTestRequest {
  channel: 'webhook' | 'email';
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
  default_webhook_url?: string | null;
  default_email_recipient?: string | null;
  test_mode_enforced: boolean;
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
  return `${Math.abs(lat).toFixed(digits)}°${latDir}, ${Math.abs(lng).toFixed(digits)}°${lngDir}`;
}

