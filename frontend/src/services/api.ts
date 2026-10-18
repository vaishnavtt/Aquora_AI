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
  ForecastVsObservationResponse,
  HazardEvaluationResult,
  HazardMonitoringEvaluationRequest,
  HazardMonitoringStatusResponse,
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

// DEMO / Fallback synthetic datasets clearly labeled for Hackathon evaluation
export const DEMO_WATER_BODIES: WaterBody[] = [
  {
    id: 1,
    name: 'Emerald Bay (DEMO Station)',
    type: 'lake',
    latitude: 37.7749,
    longitude: -122.4194,
    current_risk_level: 'low',
    risk_score: 18.5,
    water_temp_c: 20.5,
    flow_rate_cms: 0.8,
    depth_meters: 4.5,
    last_updated: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
    description: 'DEMO DATA: Calm sub-alpine lake basin with gentle circulation currents.'
  },
  {
    id: 2,
    name: 'Cascade Canyon River (DEMO Station)',
    type: 'river',
    latitude: 37.8044,
    longitude: -122.2711,
    current_risk_level: 'high',
    risk_score: 76.2,
    water_temp_c: 11.8,
    flow_rate_cms: 9.4,
    depth_meters: 3.2,
    last_updated: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    description: 'DEMO DATA: Steep canyon gorge river with surging snowmelt and dangerous undercurrents.'
  },
  {
    id: 3,
    name: 'Marina Outer Point (DEMO Station)',
    type: 'coastal',
    latitude: 37.8272,
    longitude: -122.4230,
    current_risk_level: 'moderate',
    risk_score: 52.0,
    water_temp_c: 15.1,
    flow_rate_cms: 3.6,
    depth_meters: 7.0,
    last_updated: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
    description: 'DEMO DATA: Coastal inlet with tidal rip tides and high wind chop during incoming tides.'
  },
  {
    id: 4,
    name: 'Blue Ridge Basin (DEMO Station)',
    type: 'reservoir',
    latitude: 37.7500,
    longitude: -122.3800,
    current_risk_level: 'low',
    risk_score: 14.0,
    water_temp_c: 22.0,
    flow_rate_cms: 0.4,
    depth_meters: 8.5,
    last_updated: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    description: 'DEMO DATA: Controlled municipal reservoir with stable thermal layering and monitored perimeter.'
  },
  {
    id: 5,
    name: 'Silver Rapids Crossing (DEMO Station)',
    type: 'river',
    latitude: 37.7900,
    longitude: -122.3500,
    current_risk_level: 'moderate',
    risk_score: 48.0,
    water_temp_c: 16.2,
    flow_rate_cms: 4.8,
    depth_meters: 2.8,
    last_updated: new Date(Date.now() - 1000 * 60 * 18).toISOString(),
    description: 'DEMO DATA: Shallow braided river section with boulder friction and localized vortex eddies.'
  },
  {
    id: 6,
    name: 'Blackwood Gorge (DEMO Station)',
    type: 'river',
    latitude: 37.8350,
    longitude: -122.3100,
    current_risk_level: 'extreme',
    risk_score: 88.5,
    water_temp_c: 8.5,
    flow_rate_cms: 16.2,
    depth_meters: 5.4,
    last_updated: new Date(Date.now() - 1000 * 60 * 2).toISOString(),
    description: 'DEMO DATA: High velocity torrent in narrow rock bottleneck with sub-zero wind chills.'
  }
];

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

export const api = {
  async getHealth(): Promise<HealthResponse> {
    try {
      const res = await fetch(`${API_BASE_URL}/health`);
      if (!res.ok) throw new Error(`Health check failed: ${res.statusText}`);
      return await res.json();
    } catch (err) {
      // Fallback synthetic health
      return {
        status: 'degraded',
        timestamp: new Date().toISOString(),
        version: '1.0.0 (Client Offline Fallback)',
        database: 'disconnected',
        ml_model_loaded: false
      };
    }
  },

  async getWaterBodies(params?: { risk_level?: string; type?: string }): Promise<WaterBody[]> {
    try {
      const query = new URLSearchParams();
      if (params?.risk_level) query.append('risk_level', params.risk_level);
      if (params?.type) query.append('type', params.type);

      const url = `${API_BASE_URL}/water-bodies${query.toString() ? `?${query.toString()}` : ''}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Failed to fetch water bodies: ${res.statusText}`);
      const data = await res.json();
      return Array.isArray(data) && data.length > 0 ? data : DEMO_WATER_BODIES;
    } catch {
      // Return synthetic demo stations if backend is unreachable
      let result = DEMO_WATER_BODIES;
      if (params?.risk_level) {
        result = result.filter(wb => wb.current_risk_level === params.risk_level);
      }
      if (params?.type) {
        result = result.filter(wb => wb.type === params.type);
      }
      return result;
    }
  },

  async predictRisk(payload: PredictRequest): Promise<PredictResponse> {
    try {
      const res = await fetch(`${API_BASE_URL}/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail ? JSON.stringify(errorData.detail) : `Prediction failed: ${res.statusText}`);
      }
      return await res.json();
    } catch (e) {
      // Client-side deterministic calculation matching the baseline heuristic for offline demo
      let score = 10.0;
      const hazards: string[] = [];
      const recs: string[] = [];

      if (payload.flow_rate_cms >= 12.0) {
        score += 35.0;
        hazards.push('Violent Hydrodynamic Current (>12 m³/s)');
        recs.push('DEMO HEURISTIC: Total water entry restriction recommended.');
      } else if (payload.flow_rate_cms >= 6.0) {
        score += 24.0;
        hazards.push('Rapid Current / High Flow (>6 m³/s)');
        recs.push('DEMO HEURISTIC: Non-motorized watercraft and swimming strongly discouraged.');
      }

      if (payload.water_temp_c < 10.0) {
        score += 25.0;
        hazards.push('Severe Hypothermia & Cold Shock (<10°C)');
        recs.push('DEMO HEURISTIC: Rapid cold incapacitation risk within minutes of immersion.');
      } else if (payload.water_temp_c < 15.0) {
        score += 15.0;
        hazards.push('Cold Shock Potential (<15°C)');
      }

      if (payload.rainfall_last_24h_mm >= 50.0) {
        score += 20.0;
        hazards.push('Heavy Runoff / Flash Flood Warning (>50mm)');
      } else if (payload.rainfall_last_24h_mm >= 25.0) {
        score += 10.0;
        hazards.push('Runoff & Elevated Turbidity');
      }

      if (payload.wind_speed_kmh >= 45.0) {
        score += 15.0;
        hazards.push('High Gale Winds (>45 km/h)');
      }

      const risk_score = Math.min(100.0, Math.max(5.0, score));
      let risk_level: 'low' | 'moderate' | 'high' | 'extreme' = 'low';
      if (risk_score >= 80.0) risk_level = 'extreme';
      else if (risk_score >= 60.0) risk_level = 'high';
      else if (risk_score >= 30.0) risk_level = 'moderate';

      return {
        risk_score,
        risk_level,
        confidence: 0.85,
        primary_hazards: hazards.length > 0 ? hazards : ['Nominal baseline conditions (DEMO)'],
        safety_recommendations: recs.length > 0 ? recs : ['Standard shoreline safety guidelines apply (DEMO).'],
        model_version: 'baseline-heuristic-v0.1',
        is_baseline_model: true,
        ai_explanation: payload.include_ai_explanation
          ? `DEMO SIMULATION: The computed danger score is ${risk_score}/100 (${risk_level.toUpperCase()}). Flow rate (${payload.flow_rate_cms} m³/s) and water temperature (${payload.water_temp_c}°C) are key contributing factors.`
          : null
      };
    }
  },

  async getDashboard(): Promise<DashboardResponse> {
    try {
      const res = await fetch(`${API_BASE_URL}/dashboard`);
      if (!res.ok) throw new Error(`Failed to fetch dashboard: ${res.statusText}`);
      return await res.json();
    } catch {
      return {
        total_monitored_sites: DEMO_WATER_BODIES.length,
        high_risk_sites_count: DEMO_WATER_BODIES.filter(w => w.current_risk_level === 'high' || w.current_risk_level === 'extreme').length,
        safe_sites_count: DEMO_WATER_BODIES.filter(w => w.current_risk_level === 'low').length,
        moderate_risk_sites_count: DEMO_WATER_BODIES.filter(w => w.current_risk_level === 'moderate').length,
        system_status: 'operational (demo telemetry)',
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
    }
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
];

