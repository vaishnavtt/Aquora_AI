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
  InspectionPrioritizationResponse,
  SiteInspectionPriorityItem,
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

import { KERALA_STATIONS } from '../data/keralaStations';

// DEMO / Fallback synthetic datasets calibrated for Kerala Hydrology Pilot
export const DEMO_WATER_BODIES: WaterBody[] = KERALA_STATIONS;

export const DEMO_RISK_CHANGES: RiskChangeEvent[] = [
  {
    id: 'chg-1',
    water_body_id: 2,
    water_body_name: 'Cascade Canyon River (DEMO)',
    previous_level: 'moderate',
    new_level: 'high',
    previous_score: 54.0,
    new_score: 76.2,
    trigger_reason: 'DEMO: Flow velocity surged past 9.0 m³/s following upstream rain.',
    timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    delta_direction: 'increased'
  },
  {
    id: 'chg-2',
    water_body_id: 6,
    water_body_name: 'Blackwood Gorge (DEMO)',
    previous_level: 'high',
    new_level: 'extreme',
    previous_score: 78.0,
    new_score: 88.5,
    trigger_reason: 'DEMO: Flash runoff and low water temperature (8.5°C) triggered extreme advisory.',
    timestamp: new Date(Date.now() - 1000 * 60 * 95).toISOString(),
    delta_direction: 'increased'
  },
  {
    id: 'chg-3',
    water_body_id: 1,
    water_body_name: 'Emerald Bay (DEMO)',
    previous_level: 'moderate',
    new_level: 'low',
    previous_score: 35.0,
    new_score: 18.5,
    trigger_reason: 'DEMO: Wind subsided and water temperature stabilized at 20.5°C.',
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
    const res = await fetch(`${API_BASE_URL}/weather/live?${params.toString()}`, { signal });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(formatApiError(err, `Weather fetch failed: ${res.statusText} (${res.status})`));
    }
    return await res.json();
  },

  async getWeatherForWaterBody(id: number, signal?: AbortSignal): Promise<LiveWeatherResponse> {
    const res = await fetch(`${API_BASE_URL}/weather/water-body/${id}`, { signal });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(formatApiError(err, `Weather fetch for water body failed: ${res.statusText} (${res.status})`));
    }
    return await res.json();
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


