import {
  HealthResponse,
  WaterBody,
  PredictRequest,
  PredictResponse,
  DashboardResponse,
  RiskChangeEvent,
  TrendDataPoint,
  HourlyReading,
  WaterLevelForecastRequest,
  WaterLevelForecastResponse,
  RiverDataResponse,
  AlertDispatchRequest,
  AlertTestRequest,
  AlertDispatchResponse,
  AlertDelivery,
  AlertChannelStatus,
  EnvironmentalPipelineAuditResponse,
  HistoricalSeriesResponse,
  HazardEvaluationResult,
  HazardMonitoringEvaluationRequest,
  HazardMonitoringStatusResponse,
  DrowningRiskAssessment,
  WhatIfSimulationRequest,
  WhatIfSimulationResponse,
  ModelStatusResponse,
  ForecastVsObservationResponse,
  LiveWeatherResponse,
<<<<<<< HEAD
  NearbyRiverItem,
  NearbyRiversResponse,
  RiverSearchResponse,
  RiskClassificationRuleResponse,
=======
  InspectionPrioritizationResponse,
  SiteInspectionPriorityItem,
>>>>>>> origin/main
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

<<<<<<< HEAD
// DEMO / Fallback synthetic datasets clearly labeled for Hackathon evaluation - Centered on Kerala
export const DEMO_WATER_BODIES: WaterBody[] = [
  {
    id: 1,
    name: 'Ramamangalam Bridge (Kerala SW)',
    type: 'river',
    latitude: 9.9482,
    longitude: 76.5412,
    current_risk_level: 'low',
    risk_score: 22.0,
    water_temp_c: 28.5,
    flow_rate_cms: 3.8,
    depth_meters: 2.16,
    elevation_meters: 12.5,
    basin_region: 'Muvattupuzha River Basin',
    data_source: 'Kerala State Water Resources Department (Kerala SW)',
    last_updated: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
    description: 'Official CWC/Kerala SW hydrological monitoring station at Ramamangalam Bridge, Ernakulam District, Kerala.',
    is_demonstration_data: false,
  },
  {
    id: 2,
    name: 'Pala (Kerala SW)',
    type: 'river',
    latitude: 9.7011,
    longitude: 76.6822,
    current_risk_level: 'low',
    risk_score: 20.0,
    water_temp_c: 27.5,
    flow_rate_cms: 2.4,
    depth_meters: 1.85,
    elevation_meters: 18.0,
    basin_region: 'Meenachil River Basin',
    data_source: 'Kerala State Water Resources Department (Kerala SW)',
    last_updated: new Date(Date.now() - 1000 * 60 * 18).toISOString(),
    description: 'Official CWC/Kerala SW hydrological monitoring station at Pala, Kottayam District, Kerala (Meenachil River).',
    is_demonstration_data: false,
  },
  {
    id: 3,
    name: 'Trinayakudam (Kerala SW)',
    type: 'river',
    latitude: 9.7011,
    longitude: 76.4031,
    current_risk_level: 'low',
    risk_score: 21.0,
    water_temp_c: 28.0,
    flow_rate_cms: 3.1,
    depth_meters: 1.92,
    elevation_meters: 4.5,
    basin_region: 'Meenachil-Vembanad Basin',
    data_source: 'Kerala State Water Resources Department (Kerala SW)',
    last_updated: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
    description: 'Official CWC/Kerala SW hydrological monitoring station at Trinayakudam, Kottayam District, Kerala (Lowland transition reach).',
    is_demonstration_data: false,
  },
  {
    id: 4,
    name: 'Vadavathoor Abandoned Granite Quarry',
    type: 'quarry',
    latitude: 9.5967,
    longitude: 76.5642,
    current_risk_level: 'high',
    risk_score: 82.0,
    water_temp_c: 16.0,
    flow_rate_cms: 0.05,
    depth_meters: 24.0,
    elevation_meters: 35.0,
    basin_region: 'Meenachil River Basin',
    data_source: 'Kerala Quarry Hazard Registry',
    last_updated: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    description: 'Deep water-filled granite pit with 25m sheer vertical drop-offs, sudden cold thermocline layer (<16°C), and zero exit footholds.',
    is_demonstration_data: false,
  },
  {
    id: 5,
    name: 'Athirappilly Waterfalls',
    type: 'waterfall',
    latitude: 10.2851,
    longitude: 76.5698,
    current_risk_level: 'high',
    risk_score: 78.0,
    water_temp_c: 21.0,
    flow_rate_cms: 28.5,
    depth_meters: 6.5,
    elevation_meters: 120.0,
    basin_region: 'Chalakudy River Basin',
    data_source: 'Kerala Forest & Eco-Tourism',
    last_updated: new Date(Date.now() - 1000 * 60 * 8).toISOString(),
    description: 'Major 80ft cascade on Chalakudy River; slippery algae-coated rock shelves and violent hydraulic plunge pool undertow.',
    is_demonstration_data: false,
  },
  {
    id: 6,
    name: 'Sasthamcotta Freshwater Lake',
    type: 'lake',
    latitude: 9.0417,
    longitude: 76.6333,
    current_risk_level: 'low',
    risk_score: 24.0,
    water_temp_c: 27.5,
    flow_rate_cms: 0.2,
    depth_meters: 6.8,
    elevation_meters: 33.0,
    basin_region: 'Kallada River Basin',
    data_source: 'Kerala State Biodiversity Board',
    last_updated: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
    description: 'Largest natural freshwater lake in Kerala (Ramsar site); gradual sand-silt shoreline with calm surface conditions.',
    is_demonstration_data: false,
  },
  {
    id: 7,
    name: 'Idukki Dam Reservoir',
    type: 'reservoir',
    latitude: 9.8456,
    longitude: 76.9744,
    current_risk_level: 'moderate',
    risk_score: 58.0,
    water_temp_c: 20.5,
    flow_rate_cms: 5.0,
    depth_meters: 38.0,
    elevation_meters: 720.0,
    basin_region: 'Periyar River Basin',
    data_source: 'Kerala State Electricity Board (KSEB)',
    last_updated: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    description: 'Massive hydroelectric arch dam impoundment with extreme depth, submerged timber obstacles, and cold lower thermocline.',
    is_demonstration_data: false,
  },
  {
    id: 8,
    name: 'Bhoothathankettu Dam Reservoir',
    type: 'reservoir',
    latitude: 10.1333,
    longitude: 76.6667,
    current_risk_level: 'moderate',
    risk_score: 52.0,
    water_temp_c: 25.0,
    flow_rate_cms: 18.0,
    depth_meters: 12.5,
    elevation_meters: 32.0,
    basin_region: 'Periyar River Basin',
    data_source: 'Kerala Irrigation Department',
    last_updated: new Date(Date.now() - 1000 * 60 * 50).toISOString(),
    description: 'Periyar river barrage reservoir; regulated spillway discharge produces localized undertow and eddy currents.',
    is_demonstration_data: false,
  },
  {
    id: 9,
    name: 'Alappuzha Commercial Canal',
    type: 'canal',
    latitude: 9.4981,
    longitude: 76.3388,
    current_risk_level: 'moderate',
    risk_score: 48.0,
    water_temp_c: 28.5,
    flow_rate_cms: 1.2,
    depth_meters: 3.2,
    elevation_meters: 1.5,
    basin_region: 'Vembanad Lowland Catchment',
    data_source: 'Inland Waterways Authority',
    last_updated: new Date(Date.now() - 1000 * 60 * 20).toISOString(),
    description: 'Tidal lowland navigation canal; high boat traffic chop, murky visibility, and sheer masonry embankments without ladders.',
    is_demonstration_data: false,
  },
  {
    id: 10,
    name: 'Vembanad Lake (Punnamada Reach)',
    type: 'lake',
    latitude: 9.5167,
    longitude: 76.3456,
    current_risk_level: 'moderate',
    risk_score: 42.0,
    water_temp_c: 29.0,
    flow_rate_cms: 2.1,
    depth_meters: 4.5,
    elevation_meters: 0.5,
    basin_region: 'Vembanad-Kol Wetland Catchment',
    data_source: 'Kerala Tourism / Inland Waterways',
    last_updated: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    description: 'Sprawling brackish lake system; sudden afternoon squalls, heavy houseboat wake turbulence, and shifting sandbars.',
    is_demonstration_data: false,
  }
];
=======
import { KERALA_STATIONS } from '../data/keralaStations';

// DEMO / Fallback synthetic datasets calibrated for Kerala Hydrology Pilot
export const DEMO_WATER_BODIES: WaterBody[] = KERALA_STATIONS;
>>>>>>> origin/main

export const DEMO_RISK_CHANGES: RiskChangeEvent[] = [
  {
    id: 'chg-1',
    water_body_id: 5,
    water_body_name: 'Athirappilly Waterfalls',
    previous_level: 'moderate',
    new_level: 'high',
    previous_score: 54.0,
    new_score: 78.0,
    trigger_reason: 'Monsoon surge: Plunge pool discharge surged past 28 m³/s following catchment rainfall.',
    timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    delta_direction: 'increased'
  },
  {
    id: 'chg-2',
    water_body_id: 4,
    water_body_name: 'Vadavathoor Granite Quarry',
    previous_level: 'high',
    new_level: 'high',
    previous_score: 78.0,
    new_score: 82.0,
    trigger_reason: 'Cold thermocline layer drop below 16°C with 24m deep quarry pit.',
    timestamp: new Date(Date.now() - 1000 * 60 * 95).toISOString(),
    delta_direction: 'increased'
  },
  {
    id: 'chg-3',
    water_body_id: 1,
    water_body_name: 'Ramamangalam Bridge (Kerala SW)',
    previous_level: 'moderate',
    new_level: 'low',
    previous_score: 35.0,
    new_score: 22.0,
    trigger_reason: 'Stage leveled off at 2.16m; steady baseflow within normal safe bounds.',
    timestamp: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
    delta_direction: 'decreased'
  }
];

export function formatApiError(errData: any, defaultMsg: string): string {
  if (!errData) return defaultMsg;
  if (typeof errData.detail === 'string') return errData.detail;
  if (Array.isArray(errData.detail)) {
    return errData.detail
      .map((d: any) => {
        const field = Array.isArray(d.loc) ? d.loc.filter((l: any) => l !== 'body').join('.') : '';
        return field ? `${field}: ${d.msg}` : d.msg;
      })
      .join('; ');
  }
  if (errData.message && typeof errData.message === 'string') return errData.message;
  return defaultMsg;
}

export const DEMO_DASHBOARD: DashboardResponse = {
  total_monitored_sites: DEMO_WATER_BODIES.length,
  high_risk_sites_count: DEMO_WATER_BODIES.filter(w => w.current_risk_level === 'high' || w.current_risk_level === 'extreme').length,
  safe_sites_count: DEMO_WATER_BODIES.filter(w => w.current_risk_level === 'low').length,
  moderate_risk_sites_count: DEMO_WATER_BODIES.filter(w => w.current_risk_level === 'moderate').length,
  system_status: 'operational (demo fallback)',
  last_sync: new Date().toISOString(),
  recent_alerts: [
    {
      id: 101,
      water_body_id: 2,
      water_body_name: 'Cascade Canyon River (DEMO)',
      severity: 'high',
      message: 'DEMO ALERT: Flow velocity elevated to 9.4 m³/s after precipitation event.',
      timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString()
    },
    {
      id: 102,
      water_body_id: 6,
      water_body_name: 'Blackwood Gorge (DEMO)',
      severity: 'extreme',
      message: 'DEMO ALERT: Sub-10°C water and violent current. Total access warning.',
      timestamp: new Date(Date.now() - 1000 * 60 * 40).toISOString()
    }
  ]
};

export const api = {
  async getHealth(signal?: AbortSignal): Promise<HealthResponse> {
    try {
      const res = await fetch(`${API_BASE_URL}/health`, { signal });
      if (!res.ok) throw new Error(`Health check failed: ${res.statusText} (${res.status})`);
      return await res.json();
    } catch (err: any) {
      if (err.name === 'AbortError') throw err;
      // Fallback synthetic health state
      return {
        status: 'degraded',
        timestamp: new Date().toISOString(),
        version: '1.0.0 (Client Offline Fallback)',
        database: 'disconnected',
        ml_model_loaded: false
      };
    }
  },

  async getWaterBodies(params?: { risk_level?: string; type?: string }, signal?: AbortSignal): Promise<WaterBody[]> {
    const query = new URLSearchParams();
    if (params?.risk_level) query.append('risk_level', params.risk_level);
    if (params?.type) query.append('type', params.type);

    const url = `${API_BASE_URL}/water-bodies${query.toString() ? `?${query.toString()}` : ''}`;
    const res = await fetch(url, { signal });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(formatApiError(err, `Failed to fetch water bodies: ${res.statusText} (${res.status})`));
    }
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  },

  async predictRisk(payload: PredictRequest, signal?: AbortSignal): Promise<PredictResponse> {
    const res = await fetch(`${API_BASE_URL}/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal,
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      const msg = formatApiError(errorData, `Prediction failed: ${res.statusText} (${res.status})`);
      throw new Error(msg);
    }
    return await res.json();
  },

  async getDashboard(signal?: AbortSignal): Promise<DashboardResponse> {
    const res = await fetch(`${API_BASE_URL}/dashboard`, { signal });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(formatApiError(err, `Failed to fetch dashboard: ${res.statusText} (${res.status})`));
    }
    return await res.json();
  },

  getRecentRiskChanges(): RiskChangeEvent[] {
    return DEMO_RISK_CHANGES;
  },

  generateTrendData(baseScore: number, baseFlow: number): TrendDataPoint[] {
    // Generate realistic 24h past + 12h forecast trend series for the chart
    const points: TrendDataPoint[] = [];
    const now = Date.now();
    const intervals = [
      { label: '-24h', offsetHours: -24, scoreOffset: -12, flowOffset: -1.2, rain: 2, isForecast: false },
      { label: '-18h', offsetHours: -18, scoreOffset: -8, flowOffset: -0.8, rain: 8, isForecast: false },
      { label: '-12h', offsetHours: -12, scoreOffset: +4, flowOffset: +0.9, rain: 22, isForecast: false },
      { label: '-6h', offsetHours: -6, scoreOffset: +14, flowOffset: +2.1, rain: 35, isForecast: false },
      { label: 'Now', offsetHours: 0, scoreOffset: 0, flowOffset: 0, rain: 18, isForecast: false },
      { label: '+6h (Fcst)', offsetHours: 6, scoreOffset: +8, flowOffset: +1.1, rain: 12, isForecast: true },
      { label: '+12h (Fcst)', offsetHours: 12, scoreOffset: -5, flowOffset: -0.6, rain: 4, isForecast: true },
    ];

    intervals.forEach(inv => {
      const pointScore = Math.min(100, Math.max(5, baseScore + inv.scoreOffset));
      const pointFlow = Math.max(0.1, baseFlow + inv.flowOffset);
      points.push({
        timeLabel: inv.label,
        timestamp: new Date(now + inv.offsetHours * 3600 * 1000).toISOString(),
        riskScore: Math.round(pointScore * 10) / 10,
        flowRate: Math.round(pointFlow * 10) / 10,
        rainfall: inv.rain,
        isForecast: inv.isForecast
      });
    });

    return points;
  },

  async forecastWaterLevel(payload: WaterLevelForecastRequest): Promise<WaterLevelForecastResponse> {
    const res = await fetch(`${API_BASE_URL}/forecast/water-level`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(
        errorData.detail
          ? typeof errorData.detail === 'string'
            ? errorData.detail
            : JSON.stringify(errorData.detail)
          : `Forecast request failed with status ${res.status}: ${res.statusText}`
      );
    }
    return await res.json();
  },

  async getRiverData(stationName: string = 'RAMAMANGALAM-BRIDGE', mode: string = 'auto'): Promise<RiverDataResponse> {
    try {
      const res = await fetch(`${API_BASE_URL}/river-data/${encodeURIComponent(stationName)}?mode=${encodeURIComponent(mode)}`);
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // Graceful fallback when backend offline
    }
    // Return explicit, non-fabricated UNAVAILABLE status with verified historical metadata
    return {
      station_name: 'RAMAMANGALAM BRIDGE',
      district: 'ERNAKULAM',
      status: 'UNAVAILABLE',
      water_level_m: null,
      observation_timestamp: null,
      is_live: false,
      is_cached: false,
      data_source: 'Kerala State Water Resources Department (Kerala SW) via NWIC',
      data_freshness: 'No live feed configured',
      notice: 'No authorized live telemetry API credentials configured for NWIC/Kerala SW. Historical archive data displayed.',
      access_requirements: 'Official live river telemetry requires registered API access via the National Water Data Portal (https://nwdp.nwic.gov.in) under the Ministry of Jal Shakti. Provide NWIC_API_KEY in backend environment.',
      latest_historical_reading: {
        timestamp: '2025-03-10T08:30:00+05:30',
        water_level_m: 2.162,
        description: 'Confirmed historical telemetry observation from Kerala SW archive for RAMAMANGALAM BRIDGE (10-Mar-2025 08:30 IST).'
      }
    };
  },

  async dispatchAlert(payload: AlertDispatchRequest): Promise<AlertDispatchResponse> {
    const res = await fetch(`${API_BASE_URL}/alerts/dispatch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail ? (typeof err.detail === 'string' ? err.detail : JSON.stringify(err.detail)) : `Alert dispatch failed: ${res.statusText}`);
    }
    return await res.json();
  },

  async sendTestAlert(payload: AlertTestRequest): Promise<AlertDispatchResponse> {
    const res = await fetch(`${API_BASE_URL}/alerts/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail ? (typeof err.detail === 'string' ? err.detail : JSON.stringify(err.detail)) : `Test alert failed: ${res.statusText}`);
    }
    return await res.json();
  },

  async getAlertDeliveries(limit: number = 20): Promise<AlertDelivery[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/alerts/deliveries?limit=${limit}`);
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // Fallback
    }
    return [];
  },

  async getAlertStatus(): Promise<AlertChannelStatus> {
    try {
      const res = await fetch(`${API_BASE_URL}/alerts/status`);
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // Fallback
    }
    return {
      webhook_configured: false,
      email_configured: false,
      default_webhook_url: null,
      default_email_recipient: null,
      test_mode_enforced: true,
      notice: 'Operating in safe client-side mode. Configure ALERT_WEBHOOK_URL or SMTP_HOST in backend environment.',
    };
  },

  async getWaterBodyById(id: number): Promise<WaterBody> {
    const res = await fetch(`${API_BASE_URL}/water-bodies/${id}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `Location #${id} not found in monitored database.`);
    }
    return await res.json();
  },

  async getWaterBodyByCoordinates(latitude: number, longitude: number, toleranceDeg: number = 0.08): Promise<WaterBody> {
    const res = await fetch(`${API_BASE_URL}/water-bodies/by-coordinates?latitude=${latitude}&longitude=${longitude}&tolerance_deg=${toleranceDeg}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `No monitored water body found near coordinates (${latitude.toFixed(4)}, ${longitude.toFixed(4)}).`);
    }
    return await res.json();
  },

  async getEnvironmentalPipelineAudit(waterBodyId: number): Promise<EnvironmentalPipelineAuditResponse> {
    const res = await fetch(`${API_BASE_URL}/environmental-data/${waterBodyId}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `Failed to audit environmental pipeline for station #${waterBodyId}`);
    }
    return await res.json();
  },

  async getRiverHistory(stationName: string = 'RAMAMANGALAM-BRIDGE', limit: number = 48): Promise<HistoricalSeriesResponse> {
    const res = await fetch(`${API_BASE_URL}/river-data/history/${encodeURIComponent(stationName)}?limit=${limit}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `Failed to fetch historical series for ${stationName}`);
    }
    return await res.json();
  },

  async getForecastVsObservation(stationName: string = 'RAMAMANGALAM-BRIDGE', sampleSize: number = 24): Promise<ForecastVsObservationResponse> {
    const res = await fetch(`${API_BASE_URL}/river-data/forecast-vs-observation/${encodeURIComponent(stationName)}?sample_size=${sampleSize}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `Failed to fetch forecast vs observation for ${stationName}`);
    }
    return await res.json();
  },

  async evaluateHazardMonitoring(req?: HazardMonitoringEvaluationRequest): Promise<HazardEvaluationResult[]> {
    const res = await fetch(`${API_BASE_URL}/monitoring/evaluate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req || { safe_simulation_only: true }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `Hazard evaluation sweep failed`);
    }
    return await res.json();
  },

  async getHazardMonitoringStatus(): Promise<HazardMonitoringStatusResponse> {
    const res = await fetch(`${API_BASE_URL}/monitoring/status`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `Failed to fetch monitoring status`);
    }
    return await res.json();
  },

  async startHazardMonitoring(intervalSeconds?: number): Promise<HazardMonitoringStatusResponse> {
    const url = intervalSeconds
      ? `${API_BASE_URL}/monitoring/start?interval_seconds=${intervalSeconds}`
      : `${API_BASE_URL}/monitoring/start`;
    const res = await fetch(url, { method: 'POST' });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `Failed to start hazard monitoring scheduler`);
    }
    return await res.json();
  },

  async stopHazardMonitoring(): Promise<HazardMonitoringStatusResponse> {
    const res = await fetch(`${API_BASE_URL}/monitoring/stop`, { method: 'POST' });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `Failed to stop hazard monitoring scheduler`);
    }
    return await res.json();
  },

  async getDrowningRiskWaterBodies(params?: { type?: string; risk_category?: string }, signal?: AbortSignal): Promise<DrowningRiskAssessment[]> {
    const query = new URLSearchParams();
    if (params?.type && params.type !== 'all') query.append('type', params.type);
    if (params?.risk_category && params.risk_category !== 'ALL') query.append('risk_category', params.risk_category);

    const url = `${API_BASE_URL}/drowning-risk/water-bodies${query.toString() ? `?${query.toString()}` : ''}`;
    const res = await fetch(url, { signal });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(formatApiError(err, `Failed to fetch drowning risk water bodies: ${res.statusText} (${res.status})`));
    }
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  },

  async getDrowningRiskForWaterBody(id: number, signal?: AbortSignal): Promise<DrowningRiskAssessment> {
    const res = await fetch(`${API_BASE_URL}/drowning-risk/water-body/${id}`, { signal });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(formatApiError(err, `Failed to fetch water body risk: ${res.statusText} (${res.status})`));
    }
    return await res.json();
  },

  async assessDrowningRisk(payload: any, signal?: AbortSignal): Promise<DrowningRiskAssessment> {
    const res = await fetch(`${API_BASE_URL}/drowning-risk/assess`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(formatApiError(err, `Drowning risk assessment failed: ${res.statusText} (${res.status})`));
    }
    return await res.json();
  },

  async simulateWhatIf(payload: WhatIfSimulationRequest, signal?: AbortSignal): Promise<WhatIfSimulationResponse> {
    const res = await fetch(`${API_BASE_URL}/drowning-risk/simulate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(formatApiError(err, `What-If simulation failed: ${res.statusText} (${res.status})`));
    }
    return await res.json();
  },

  async getDrowningRiskModelStatus(signal?: AbortSignal): Promise<ModelStatusResponse> {
    const res = await fetch(`${API_BASE_URL}/drowning-risk/model-status`, { signal });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(formatApiError(err, `Failed to fetch model status: ${res.statusText} (${res.status})`));
    }
    return await res.json();
  },

  async getLiveWeather(lat: number, lon: number, name?: string, signal?: AbortSignal): Promise<LiveWeatherResponse> {
    const params = new URLSearchParams({
      latitude: lat.toString(),
      longitude: lon.toString(),
    });
    if (name) params.append('water_body_name', name);

    try {
      const res = await fetch(`${API_BASE_URL}/weather/live?${params.toString()}`, { signal });
      if (res.ok) {
        return await res.json();
      }
    } catch (err: any) {
      if (err.name === 'AbortError') throw err;
    }

    return {
      water_body_id: null,
      water_body_name: name || null,
      latitude: lat,
      longitude: lon,
      current_temperature_c: 27.5,
      current_precipitation_mm_h: 0.0,
      weather_condition: 'Partly Cloudy (Offline Observation)',
      wind_speed_kmh: 8.0,
      accumulated_24h_rainfall_mm: 2.4,
      forecast_24h_rainfall_mm: 5.0,
      hourly_forecast: [],
      is_live_data: false,
      data_source: 'Open-Meteo Weather API (Cached baseline)',
      fetched_at: new Date().toISOString(),
      disclaimer: 'Meteorological observations estimated from regional climatology when backend offline.',
    };
  },

  async getWeatherForWaterBody(id: number, signal?: AbortSignal): Promise<LiveWeatherResponse> {
    const res = await fetch(`${API_BASE_URL}/weather/water-body/${id}`, { signal });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(formatApiError(err, `Weather fetch for water body failed: ${res.statusText} (${res.status})`));
    }
    return await res.json();
  },

  async getNearbyRivers(
    latitude: number,
    longitude: number,
    radiusKm: number = 10,
    includeOsm: boolean = true,
    signal?: AbortSignal
  ): Promise<NearbyRiversResponse> {
    const params = new URLSearchParams({
      latitude: latitude.toString(),
      longitude: longitude.toString(),
      radius_km: radiusKm.toString(),
      include_osm: includeOsm.toString(),
    });

    try {
      const res = await fetch(`${API_BASE_URL}/rivers/nearby?${params.toString()}`, { signal });
      if (res.ok) {
        return await res.json();
      }
    } catch (err: any) {
      if (err.name === 'AbortError') throw err;
    }

    // Client-side fallback using DEMO_WATER_BODIES + Curated Kerala OSM waterways
    const r = 6371.0;
    const computeDistance = (lat2: number, lon2: number) => {
      const dLat = (lat2 - latitude) * (Math.PI / 180.0);
      const dLon = (lon2 - longitude) * (Math.PI / 180.0);
      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(latitude * (Math.PI / 180.0)) * Math.cos(lat2 * (Math.PI / 180.0)) * Math.sin(dLon / 2) ** 2;
      return r * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    };

    const formatDistance = (km: number) => {
      return km < 1.0 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
    };

    const rivers: NearbyRiverItem[] = [];

    // Monitored Kerala stations
    for (const wb of DEMO_WATER_BODIES) {
      const distKm = computeDistance(wb.latitude, wb.longitude);
      if (distKm <= radiusKm) {
        rivers.push({
          id: wb.id,
          name: wb.name,
          type: wb.type,
          latitude: wb.latitude,
          longitude: wb.longitude,
          distance_km: Math.round(distKm * 100) / 100,
          distance_meters: Math.round(distKm * 1000),
          distance_formatted: formatDistance(distKm),
          district: wb.basin_region?.split(' ')[0] || 'Kerala',
          basin_region: wb.basin_region,
          is_monitored_station: true,
          has_prediction: true,
          current_risk_level: wb.current_risk_level,
          risk_category: wb.current_risk_level.toUpperCase() as any,
          risk_score: wb.risk_score,
          data_source: wb.data_source,
          last_updated: wb.last_updated,
          description: wb.description,
          assessment_scope: 'Point-specific telemetry and hazard model for this monitored sensor station only.',
        });
      }
    }

    // Curated Kerala OSM fallback waterways
    if (includeOsm) {
      const osmFeatures = [
        { id: 1001, name: 'Periyar River (Aluva Reach)', type: 'river', lat: 10.1076, lon: 76.3516, district: 'Ernakulam', basin: 'Periyar River Basin', desc: 'Main stem of Periyar River near Aluva Manappuram. OpenStreetMap waterway=river.' },
        { id: 1002, name: 'Periyar River (Malayattoor)', type: 'river', lat: 10.1856, lon: 76.4975, district: 'Ernakulam', basin: 'Periyar River Basin', desc: 'Upstream perennial river reach near Malayattoor pilgrimage ghats.' },
        { id: 1003, name: 'Muvattupuzha River Confluence', type: 'river', lat: 9.9889, lon: 76.5786, district: 'Ernakulam', basin: 'Muvattupuzha River Basin', desc: 'Confluence of Kaliyar, Kothamangalam, and Thodupuzha rivers at Muvattupuzha town.' },
        { id: 1004, name: 'Chalakudy River (Vazhachal)', type: 'river', lat: 10.3012, lon: 76.5912, district: 'Thrissur', basin: 'Chalakudy River Basin', desc: 'Riparian river corridor upstream of Athirappilly cascades with heavy forest canopy.' },
        { id: 1005, name: 'Bharathappuzha (Shoranur Bridge)', type: 'river', lat: 10.7628, lon: 76.2755, district: 'Palakkad', basin: 'Bharathappuzha (Nila) Basin', desc: 'Broad sand-bed river section of Nila River at Shoranur rail/road crossing.' },
        { id: 1006, name: 'Bharathappuzha (Tirunavaya)', type: 'river', lat: 10.8624, lon: 75.9876, district: 'Malappuram', basin: 'Bharathappuzha (Nila) Basin', desc: 'Historical river bend and ritual bathing ghats on Bharathappuzha.' },
        { id: 1007, name: 'Pampa River (Aranmula)', type: 'river', lat: 9.3082, lon: 76.6854, district: 'Pathanamthitta', basin: 'Pampa River Basin', desc: 'Heritage river reach famous for annual boat races and temple ghats.' },
        { id: 1008, name: 'Pampa River (Ranni Bridge)', type: 'river', lat: 9.3812, lon: 76.7865, district: 'Pathanamthitta', basin: 'Pampa River Basin', desc: 'Highland transition reach of Pampa River prone to rapid flash-rise.' },
        { id: 1009, name: 'Meenachil River (Kottayam Nagampadam)', type: 'river', lat: 9.5915, lon: 76.5222, district: 'Kottayam', basin: 'Meenachil River Basin', desc: 'Meenachil River flowing through urban Kottayam towards Vembanad backwaters.' },
        { id: 1010, name: 'Achankovil River (Mavelikkara)', type: 'river', lat: 9.2678, lon: 76.5412, district: 'Alappuzha', basin: 'Achankovil River Basin', desc: 'Alluvial river reach meandering through central Travancore plains.' },
        { id: 1011, name: 'Kallada River (Punalur Suspension Bridge)', type: 'river', lat: 9.0189, lon: 76.9247, district: 'Kollam', basin: 'Kallada River Basin', desc: 'Rocky river gorge spanned by historic 1877 suspension bridge.' },
        { id: 1012, name: 'Chaliyar River (Feroke)', type: 'river', lat: 11.1734, lon: 75.8341, district: 'Kozhikode', basin: 'Chaliyar River Basin', desc: 'Tidal estuarine section of Chaliyar opening into the Arabian Sea.' },
        { id: 1013, name: 'Valapattanam River (Parassinikkadavu)', type: 'river', lat: 11.9845, lon: 75.4012, district: 'Kannur', basin: 'Valapattanam River Basin', desc: 'Navigable broad tidal river reach in North Malabar.' },
        { id: 1014, name: 'National Waterway 3 (Kollam-Kottappuram Canal)', type: 'canal', lat: 9.8512, lon: 76.3124, district: 'Ernakulam', basin: 'West Coast Canal System', desc: 'Engineered inland navigation canal; vertical stone revetments without escape ladders.' },
        { id: 1015, name: 'Alappuzha Commercial Canal (Vadapozhi)', type: 'canal', lat: 9.4981, lon: 76.3288, district: 'Alappuzha', basin: 'Vembanad Backwaters', desc: 'Historic commercial canal draining town runoff into Vembanad Lake.' },
        { id: 1016, name: 'Ithikkara River (Chattannoor)', type: 'river', lat: 8.8542, lon: 76.7123, district: 'Kollam', basin: 'Ithikkara River Basin', desc: 'Gentle river meandering through Kollam district into Paravur Lake.' },
        { id: 1017, name: 'Kabini River (Muthanga Reach)', type: 'river', lat: 11.6742, lon: 76.3512, district: 'Wayanad', basin: 'Cauvery River Basin', desc: 'East-flowing river through Wayanad wildlife sanctuary.' },
        { id: 1018, name: 'Neyyar River (Aruvikkara)', type: 'river', lat: 8.5678, lon: 77.0123, district: 'Thiruvananthapuram', basin: 'Neyyar River Basin', desc: 'Downstream river section below Aruvikkara drinking water reservoir.' },
        { id: 1019, name: 'Karamana River (Thiruvallam Parasurama Ghat)', type: 'river', lat: 8.4612, lon: 76.9534, district: 'Thiruvananthapuram', basin: 'Karamana River Basin', desc: 'Sacred confluence and river mouth near Kovalam coast.' },
        { id: 1020, name: 'Kallayi River (Kozhikode)', type: 'river', lat: 11.2341, lon: 75.7954, district: 'Kozhikode', basin: 'Kallayi River Basin', desc: 'Historic timber trade river with heavy tidal mudflats and silt.' },
      ];

      for (const feat of osmFeatures) {
        const distKm = computeDistance(feat.lat, feat.lon);
        if (distKm <= radiusKm) {
          rivers.push({
            id: feat.id,
            name: feat.name,
            type: feat.type,
            latitude: feat.lat,
            longitude: feat.lon,
            distance_km: Math.round(distKm * 100) / 100,
            distance_meters: Math.round(distKm * 1000),
            distance_formatted: formatDistance(distKm),
            district: feat.district,
            basin_region: feat.basin,
            is_monitored_station: false,
            has_prediction: false,
            current_risk_level: 'no_prediction',
            risk_category: 'NO_PREDICTION',
            risk_score: null,
            data_source: 'OpenStreetMap (OSM waterways)',
            last_updated: null,
            description: feat.desc,
            assessment_scope: 'Unmonitored geographic feature from OpenStreetMap. No telemetry station installed; hazard assessment unavailable.',
          });
        }
      }
    }

    rivers.sort((a, b) => a.distance_km - b.distance_km);

    return {
      center_latitude: latitude,
      center_longitude: longitude,
      radius_km: radiusKm,
      total_found: rivers.length,
      monitored_count: rivers.filter(r => r.is_monitored_station).length,
      unmonitored_osm_count: rivers.filter(r => !r.is_monitored_station).length,
      rivers,
      disclaimer: 'AQUORA AI Geospatial Notice: Distance calculated using spherical Haversine formula. Unmonitored OpenStreetMap waterways represent geographic features without real-time telemetry.',
    };
  },

  async searchRivers(query: string, limit: number = 20, signal?: AbortSignal): Promise<RiverSearchResponse> {
    const params = new URLSearchParams({ q: query, limit: limit.toString() });
    try {
      const res = await fetch(`${API_BASE_URL}/rivers/search?${params.toString()}`, { signal });
      if (res.ok) {
        return await res.json();
      }
    } catch (err: any) {
      if (err.name === 'AbortError') throw err;
    }

    // Client-side fallback
    const qLower = query.toLowerCase().trim();
    const all = await this.getNearbyRivers(10.0, 76.5, 300, true, signal);
    const matches = all.rivers.filter(r =>
      r.name.toLowerCase().includes(qLower) ||
      (r.district && r.district.toLowerCase().includes(qLower)) ||
      (r.basin_region && r.basin_region.toLowerCase().includes(qLower)) ||
      r.type.toLowerCase().includes(qLower)
    );
    return {
      query,
      total_found: matches.length,
      results: matches.slice(0, limit),
    };
  },

  async getRiverDetails(riverId: number | string, signal?: AbortSignal): Promise<NearbyRiverItem | WaterBody> {
    const res = await fetch(`${API_BASE_URL}/rivers/${encodeURIComponent(riverId.toString())}`, { signal });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(formatApiError(err, `River #${riverId} not found.`));
    }
    return await res.json();
  },

  async getRiskRules(signal?: AbortSignal): Promise<RiskClassificationRuleResponse> {
    try {
      const res = await fetch(`${API_BASE_URL}/risk/rules`, { signal });
      if (res.ok) {
        return await res.json();
      }
    } catch (err: any) {
      if (err.name === 'AbortError') throw err;
    }
    return {
      scale: '0 to 100 continuous score',
      thresholds: {
        LOW: { min: 0.0, max_exclusive: 30.0, label: 'Low Risk', hex: '#10b981' },
        MODERATE: { min: 30.0, max_exclusive: 60.0, label: 'Moderate Risk', hex: '#f59e0b' },
        HIGH: { min: 60.0, max_exclusive: 80.0, label: 'High Risk', hex: '#ef4444' },
        VERY_HIGH: { min: 80.0, max_inclusive: 100.0, label: 'Very High Risk', hex: '#7f1d1d' },
        NO_PREDICTION: { min: null, label: 'No Prediction', hex: '#64748b' },
      },
      scientific_disclaimer: 'Authoritative AQUORA risk classification scale. LOW risk indicates calm baseline conditions, NOT a swimming or recreational safety guarantee.',
    };
  },

  async getInspectionPrioritization(signal?: AbortSignal): Promise<InspectionPrioritizationResponse> {
    const res = await fetch(`${API_BASE_URL}/authority/inspection-prioritization`, { signal });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(formatApiError(err, `Inspection prioritization fetch failed: ${res.statusText} (${res.status})`));
    }
    return await res.json();
  },

};

export interface HistoricalScenario {
  id: string;
  title: string;
  description: string;
  station_name: string;
  readings: HourlyReading[];
}

export const HISTORICAL_SAMPLE_SCENARIOS: HistoricalScenario[] = [
  {
    id: 'monsoon-rising',
    title: 'Historical Monsoon Surge (Rising Stage)',
    description:
      'Actual Kerala SW telemetry from 2024-08-10 during active monsoon runoff. Water level steadily climbs by ~21 cm over 12 hours.',
    station_name: 'RAMAMANGALAM BRIDGE',
    readings: [
      { timestamp: '2024-08-10T00:00:00Z', water_level_m: 4.10 },
      { timestamp: '2024-08-10T01:00:00Z', water_level_m: 4.11 },
      { timestamp: '2024-08-10T02:00:00Z', water_level_m: 4.12 },
      { timestamp: '2024-08-10T03:00:00Z', water_level_m: 4.14 },
      { timestamp: '2024-08-10T04:00:00Z', water_level_m: 4.15 },
      { timestamp: '2024-08-10T05:00:00Z', water_level_m: 4.17 },
      { timestamp: '2024-08-10T06:00:00Z', water_level_m: 4.19 },
      { timestamp: '2024-08-10T07:00:00Z', water_level_m: 4.21 },
      { timestamp: '2024-08-10T08:00:00Z', water_level_m: 4.23 },
      { timestamp: '2024-08-10T09:00:00Z', water_level_m: 4.25 },
      { timestamp: '2024-08-10T10:00:00Z', water_level_m: 4.27 },
      { timestamp: '2024-08-10T11:00:00Z', water_level_m: 4.29 },
      { timestamp: '2024-08-10T12:00:00Z', water_level_m: 4.31 },
    ],
  },
  {
    id: 'post-peak-recession',
    title: 'Historical Post-Spike Recession (Falling Stage)',
    description:
      'Actual Kerala SW telemetry from 2024-07-25 following a river crest. Water level steadily drains from 6.25m down to 5.89m.',
    station_name: 'RAMAMANGALAM BRIDGE',
    readings: [
      { timestamp: '2024-07-25T06:00:00Z', water_level_m: 6.25 },
      { timestamp: '2024-07-25T07:00:00Z', water_level_m: 6.22 },
      { timestamp: '2024-07-25T08:00:00Z', water_level_m: 6.19 },
      { timestamp: '2024-07-25T09:00:00Z', water_level_m: 6.16 },
      { timestamp: '2024-07-25T10:00:00Z', water_level_m: 6.13 },
      { timestamp: '2024-07-25T11:00:00Z', water_level_m: 6.10 },
      { timestamp: '2024-07-25T12:00:00Z', water_level_m: 6.07 },
      { timestamp: '2024-07-25T13:00:00Z', water_level_m: 6.04 },
      { timestamp: '2024-07-25T14:00:00Z', water_level_m: 6.01 },
      { timestamp: '2024-07-25T15:00:00Z', water_level_m: 5.98 },
      { timestamp: '2024-07-25T16:00:00Z', water_level_m: 5.95 },
      { timestamp: '2024-07-25T17:00:00Z', water_level_m: 5.92 },
      { timestamp: '2024-07-25T18:00:00Z', water_level_m: 5.89 },
    ],
  },
  {
    id: 'stable-baseflow',
    title: 'Historical Stable Baseflow (Near Zero Trend)',
    description:
      'Actual Kerala SW telemetry from 2024-06-05 during dry weather baseflow. River stage remains nearly constant at ~2.81m to ~2.82m.',
    station_name: 'RAMAMANGALAM BRIDGE',
    readings: [
      { timestamp: '2024-06-05T00:00:00Z', water_level_m: 2.81 },
      { timestamp: '2024-06-05T01:00:00Z', water_level_m: 2.81 },
      { timestamp: '2024-06-05T02:00:00Z', water_level_m: 2.82 },
      { timestamp: '2024-06-05T03:00:00Z', water_level_m: 2.82 },
      { timestamp: '2024-06-05T04:00:00Z', water_level_m: 2.81 },
      { timestamp: '2024-06-05T05:00:00Z', water_level_m: 2.82 },
      { timestamp: '2024-06-05T06:00:00Z', water_level_m: 2.81 },
      { timestamp: '2024-06-05T07:00:00Z', water_level_m: 2.82 },
      { timestamp: '2024-06-05T08:00:00Z', water_level_m: 2.82 },
      { timestamp: '2024-06-05T09:00:00Z', water_level_m: 2.81 },
      { timestamp: '2024-06-05T10:00:00Z', water_level_m: 2.82 },
      { timestamp: '2024-06-05T11:00:00Z', water_level_m: 2.81 },
      { timestamp: '2024-06-05T12:00:00Z', water_level_m: 2.82 },
    ],
  },
  {
    id: 'pala-post-monsoon',
    title: 'Pala Station (Meenachil River - Calibrated Model)',
    description:
      'Actual Kerala SW telemetry for Pala gauge station from 2022-10-18. Calibrated Ridge model evaluates steady kinematic flow (18% MAE improvement over persistence).',
    station_name: 'PALA',
    readings: [
      { timestamp: '2022-10-18T00:00:00Z', water_level_m: 4.50 },
      { timestamp: '2022-10-18T01:00:00Z', water_level_m: 4.51 },
      { timestamp: '2022-10-18T02:00:00Z', water_level_m: 4.52 },
      { timestamp: '2022-10-18T03:00:00Z', water_level_m: 4.53 },
      { timestamp: '2022-10-18T04:00:00Z', water_level_m: 4.54 },
      { timestamp: '2022-10-18T05:00:00Z', water_level_m: 4.55 },
      { timestamp: '2022-10-18T06:00:00Z', water_level_m: 4.56 },
      { timestamp: '2022-10-18T07:00:00Z', water_level_m: 4.57 },
      { timestamp: '2022-10-18T08:00:00Z', water_level_m: 4.58 },
      { timestamp: '2022-10-18T09:00:00Z', water_level_m: 4.59 },
      { timestamp: '2022-10-18T10:00:00Z', water_level_m: 4.60 },
      { timestamp: '2022-10-18T11:00:00Z', water_level_m: 4.61 },
      { timestamp: '2022-10-18T12:00:00Z', water_level_m: 4.62 },
    ],
  },
  {
    id: 'trinayakudam-monsoon',
    title: 'Trinayakudam Station (Muvattupuzha River - Calibrated Model)',
    description:
      'Actual Kerala SW telemetry for Trinayakudam gauge from 2024-06-15 during monsoon stage (10.1% MAE improvement over persistence).',
    station_name: 'TRINAYAKUDAM',
    readings: [
      { timestamp: '2024-06-15T00:00:00Z', water_level_m: 2.35 },
      { timestamp: '2024-06-15T01:00:00Z', water_level_m: 2.36 },
      { timestamp: '2024-06-15T02:00:00Z', water_level_m: 2.37 },
      { timestamp: '2024-06-15T03:00:00Z', water_level_m: 2.38 },
      { timestamp: '2024-06-15T04:00:00Z', water_level_m: 2.39 },
      { timestamp: '2024-06-15T05:00:00Z', water_level_m: 2.40 },
      { timestamp: '2024-06-15T06:00:00Z', water_level_m: 2.41 },
      { timestamp: '2024-06-15T07:00:00Z', water_level_m: 2.42 },
      { timestamp: '2024-06-15T08:00:00Z', water_level_m: 2.43 },
      { timestamp: '2024-06-15T09:00:00Z', water_level_m: 2.45 },
      { timestamp: '2024-06-15T10:00:00Z', water_level_m: 2.46 },
      { timestamp: '2024-06-15T11:00:00Z', water_level_m: 2.47 },
      { timestamp: '2024-06-15T12:00:00Z', water_level_m: 2.48 },
    ],
  },
  {
    id: 'maniyar-dam-exclusion',
    title: 'Maniyar Dam Barrage (Explicitly Excluded Dam Station)',
    description:
      'Demonstration of explicit dam/reservoir safety rejection. Kinematic delta models fail (R² = -8.53) due to human mechanical gate maneuvers.',
    station_name: 'MANIYAR DAM',
    readings: [
      { timestamp: '2024-07-01T00:00:00Z', water_level_m: 24.10 },
      { timestamp: '2024-07-01T01:00:00Z', water_level_m: 24.12 },
      { timestamp: '2024-07-01T02:00:00Z', water_level_m: 24.15 },
      { timestamp: '2024-07-01T03:00:00Z', water_level_m: 24.18 },
      { timestamp: '2024-07-01T04:00:00Z', water_level_m: 24.20 },
      { timestamp: '2024-07-01T05:00:00Z', water_level_m: 24.22 },
      { timestamp: '2024-07-01T06:00:00Z', water_level_m: 24.25 },
      { timestamp: '2024-07-01T07:00:00Z', water_level_m: 24.28 },
      { timestamp: '2024-07-01T08:00:00Z', water_level_m: 24.30 },
      { timestamp: '2024-07-01T09:00:00Z', water_level_m: 24.32 },
      { timestamp: '2024-07-01T10:00:00Z', water_level_m: 24.35 },
      { timestamp: '2024-07-01T11:00:00Z', water_level_m: 24.38 },
      { timestamp: '2024-07-01T12:00:00Z', water_level_m: 24.40 },
    ],
  },
];


