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

export interface DashboardResponse {
  total_monitored_sites: number;
  high_risk_sites_count: number;
  safe_sites_count: number;
  moderate_risk_sites_count: number;
  system_status: string;
  last_sync: string;
  recent_alerts: DashboardAlert[];
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
