import { describe, it, expect, afterEach, vi } from 'vitest';
import { api, DEMO_WATER_BODIES, DEMO_DASHBOARD, formatApiError } from '../services/api';
import {
  PredictRequest,
  WaterLevelForecastRequest,
  HealthResponse,
  HazardMonitoringStatusResponse,
  HazardEvaluationResult,
  AlertDispatchResponse,
  EnvironmentalPipelineAuditResponse,
  WaterLevelForecastResponse,
} from '../types';

describe('AQUORA AI Frontend API Integration & Reliability Suite', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  describe('formatApiError Helper', () => {
    it('formats plain string detail correctly', () => {
      const error = { detail: 'Water body not found' };
      expect(formatApiError(error, 'Default')).toBe('Water body not found');
    });

    it('formats Pydantic 422 validation array into readable field messages', () => {
      const error = {
        detail: [
          { loc: ['body', 'rainfall_last_24h_mm'], msg: 'Input should be less than or equal to 1000' },
          { loc: ['body', 'water_temp_c'], msg: 'Input should be greater than or equal to -5' },
        ],
      };
      const formatted = formatApiError(error, 'Validation error');
      expect(formatted).toBe(
        'rainfall_last_24h_mm: Input should be less than or equal to 1000; water_temp_c: Input should be greater than or equal to -5'
      );
    });

    it('falls back to default message if error object is empty or malformed', () => {
      expect(formatApiError(null, 'Network connection failure')).toBe('Network connection failure');
      expect(formatApiError({}, 'Fallback message')).toBe('Fallback message');
    });
  });

  describe('Health API & Connectivity Verification', () => {
    it('successfully retrieves and parses healthy status from backend', async () => {
      const mockHealth: HealthResponse = {
        status: 'healthy',
        timestamp: '2026-10-19T10:00:00Z',
        version: '1.0.0',
        database: 'connected',
        ml_model_loaded: true,
      };

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockHealth,
      });

      const result = await api.getHealth();
      expect(result.status).toBe('healthy');
      expect(result.version).toBe('1.0.0');
      expect(result.ml_model_loaded).toBe(true);
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/health'),
        expect.objectContaining({ signal: undefined })
      );
    });

    it('returns degraded status with disconnected database indicator when backend health fails', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable',
        json: async () => ({ detail: 'Database connection failed' }),
      });

      const result = await api.getHealth();
      expect(result.status).toBe('degraded');
      expect(result.database).toBe('disconnected');
      expect(result.ml_model_loaded).toBe(false);
    });

    it('respects AbortSignal for health cancellation', async () => {
      const controller = new AbortController();
      controller.abort();

      globalThis.fetch = vi.fn().mockRejectedValue(new DOMException('Aborted', 'AbortError'));

      await expect(api.getHealth(controller.signal)).rejects.toThrow('Aborted');
    });
  });

  describe('Water Bodies API & Filter Handling', () => {
    it('returns filtered water bodies from backend', async () => {
      const mockStations = [
        {
          id: 1,
          name: 'Cascade Canyon River',
          type: 'river' as const,
          latitude: 37.77,
          longitude: -122.41,
          depth_meters: 4.5,
          current_risk_level: 'moderate' as const,
          risk_score: 52.0,
          water_temp_c: 18.2,
          flow_rate_cms: 34.1,
          last_updated: '2026-10-19T10:00:00Z',
        },
      ];

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockStations,
      });

      const result = await api.getWaterBodies({ risk_level: 'moderate' });
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Cascade Canyon River');
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('risk_level=moderate'),
        expect.anything()
      );
    });

    it('returns empty array when backend query finds 0 stations instead of falling back to demo stations', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => [],
      });

      const result = await api.getWaterBodies({ type: 'unknown_type' });
      expect(result).toEqual([]);
      expect(result).not.toEqual(DEMO_WATER_BODIES);
    });

    it('fetches specific water body by ID', async () => {
      const mockStation = {
        id: 2,
        name: 'Cascade Canyon River',
        type: 'river' as const,
        latitude: 37.77,
        longitude: -122.41,
        depth_meters: 4.5,
        current_risk_level: 'moderate' as const,
        risk_score: 52.0,
        water_temp_c: 18.2,
        flow_rate_cms: 34.1,
        last_updated: '2026-10-19T10:00:00Z',
      };

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockStation,
      });

      const station = await api.getWaterBodyById(2);
      expect(station.id).toBe(2);
      expect(station.name).toBe('Cascade Canyon River');
    });

    it('fetches water body by coordinates with tolerance query', async () => {
      const mockStation = { id: 3, name: 'Lake Serene', latitude: 37.8, longitude: -122.3 };

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockStation,
      });

      const station = await api.getWaterBodyByCoordinates(37.8, -122.3, 0.05);
      expect(station.id).toBe(3);
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/water-bodies/by-coordinates?latitude=37.8&longitude=-122.3&tolerance_deg=0.05')
      );
    });
  });

  describe('Hazard Risk Prediction API & Error Propagation', () => {
    const validRequest: PredictRequest = {
      water_body_id: 1,
      rainfall_last_24h_mm: 55.4,
      water_temp_c: 19.5,
      flow_rate_cms: 42.0,
      depth_meters: 4.2,
      wind_speed_kmh: 22.0,
      visibility_meters: 5000,
      include_ai_explanation: true,
    };

    it('submits prediction request and parses genuine backend risk response', async () => {
      const mockPredictResponse = {
        risk_score: 74.5,
        risk_level: 'high' as const,
        confidence: 0.92,
        primary_hazards: ['Rapid flood surge', 'Turbid current'],
        safety_recommendations: ['Evacuate immediate banks', 'Deploy flood barrier'],
        model_version: '1.2.0-baseline-heuristic',
        is_baseline_model: true,
        ai_explanation: 'Significant hydrodynamic risk due to combined rainfall and water flow surges.',
      };

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockPredictResponse,
      });

      const result = await api.predictRisk(validRequest);
      expect(result.risk_level).toBe('high');
      expect(result.risk_score).toBe(74.5);
      expect(result.confidence).toBe(0.92);
      expect(result.model_version).toBe('1.2.0-baseline-heuristic');
      expect(result.ai_explanation).toBeDefined();

      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/predict'),
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(validRequest),
        })
      );
    });

    it('DOES NOT fabricate mock results when backend returns 422 Unprocessable Entity', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 422,
        json: async () => ({
          detail: [
            {
              loc: ['body', 'rainfall_last_24h_mm'],
              msg: 'Input should be less than or equal to 1000',
              type: 'less_than_equal',
            },
          ],
        }),
      });

      await expect(
        api.predictRisk({ ...validRequest, rainfall_last_24h_mm: 9999 })
      ).rejects.toThrow('rainfall_last_24h_mm: Input should be less than or equal to 1000');
    });

    it('DOES NOT fabricate mock results when backend returns 404 Water Body Not Found', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        json: async () => ({ detail: 'Water body 99999 not found' }),
      });

      await expect(api.predictRisk({ ...validRequest, water_body_id: 99999 })).rejects.toThrow(
        'Water body 99999 not found'
      );
    });

    it('aborts previous in-flight request when signal is triggered', async () => {
      const controller = new AbortController();
      controller.abort();

      globalThis.fetch = vi.fn().mockRejectedValue(new DOMException('Aborted', 'AbortError'));

      await expect(api.predictRisk(validRequest, controller.signal)).rejects.toThrow('Aborted');
    });
  });

  describe('Water Level Forecasting Pipeline', () => {
    const validForecastRequest: WaterLevelForecastRequest = {
      station_name: 'RAMAMANGALAM BRIDGE',
      readings: [
        { timestamp: '2026-10-19T06:00:00Z', water_level_m: 11.2 },
        { timestamp: '2026-10-19T07:00:00Z', water_level_m: 11.5 },
        { timestamp: '2026-10-19T08:00:00Z', water_level_m: 11.8 },
      ],
    };

    it('submits forecast calculation and parses multi-horizon outputs', async () => {
      const mockForecastResponse: WaterLevelForecastResponse = {
        station: 'RAMAMANGALAM BRIDGE',
        district: 'Ernakulam',
        forecast_horizon: '6h',
        latest_observation_timestamp: '2026-10-19T08:00:00Z',
        forecast_target_timestamp: '2026-10-19T14:00:00Z',
        current_water_level_m: 11.8,
        persistence_baseline_m: 11.8,
        predicted_delta_m: 0.6,
        forecasted_water_level_m: 12.4,
        rate_of_change_trend: 'rising',
        model_type: 'linear-trend-v1',
        is_experimental: true,
        notice: 'Experimental forecast generated by persistence & linear trend model.',
      };

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockForecastResponse,
      });

      const result = await api.forecastWaterLevel(validForecastRequest);
      expect(result.station).toBe('RAMAMANGALAM BRIDGE');
      expect(result.rate_of_change_trend).toBe('rising');
      expect(result.forecasted_water_level_m).toBe(12.4);
    });

    it('rejects with proper error when forecast payload is rejected', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({ detail: 'At least 2 hourly readings required for trend projection' }),
      });

      await expect(
        api.forecastWaterLevel({
          station_name: 'TEST',
          readings: [{ timestamp: '2026-10-19T01:00:00Z', water_level_m: 10.0 }],
        })
      ).rejects.toThrow('At least 2 hourly readings required');
    });
  });

  describe('Hazard Monitoring & Outbound Alerting', () => {
    it('retrieves hazard monitoring status correctly', async () => {
      const mockStatus: HazardMonitoringStatusResponse = {
        is_scheduler_running: true,
        monitoring_interval_seconds: 60,
        safe_simulation_enforced: true,
        thresholds: { high_risk: 70.0 },
        monitored_stations: ['Cascade Canyon River', 'Emerald Bay'],
        last_evaluation_timestamp: '2026-10-19T10:00:00Z',
        evaluations_count: 12,
        recent_evaluations: [],
      };

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockStatus,
      });

      const status = await api.getHazardMonitoringStatus();
      expect(status.is_scheduler_running).toBe(true);
      expect(status.monitored_stations).toHaveLength(2);
      expect(status.evaluations_count).toBe(12);
    });

    it('evaluates hazard monitoring sweep', async () => {
      const mockSweepResults: HazardEvaluationResult[] = [
        {
          station_name: 'Cascade Canyon River',
          evaluation_status: 'HAZARD_DETECTED',
          is_live: true,
          recalculated_risk_score: 75.2,
          recalculated_risk_level: 'high',
          triggers_detected: [
            {
              trigger_type: 'HIGH_FLOW',
              observed_value: 38.5,
              threshold_value: 30.0,
              description: 'Flow velocity exceeded critical threshold',
            },
          ],
          confirmed_by_provider: true,
          evaluated_at: '2026-10-19T10:05:00Z',
          notice: 'Hazard sweep detected surge',
        },
      ];

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockSweepResults,
      });

      const sweep = await api.evaluateHazardMonitoring({ safe_simulation_only: true });
      expect(sweep).toHaveLength(1);
      expect(sweep[0].evaluation_status).toBe('HAZARD_DETECTED');
      expect(sweep[0].recalculated_risk_score).toBe(75.2);
    });

    it('triggers test alert and returns delivery receipt', async () => {
      const mockAlertResult: AlertDispatchResponse = {
        delivery_id: 'del-901',
        channel: 'email',
        recipient: 'operator@aquora.internal',
        severity: 'extreme',
        status: 'DELIVERED',
        confirmed_by_provider: true,
        provider_message: 'Delivered simulated alert to operator',
        dispatched_at: '2026-10-19T10:06:00Z',
        test_mode: true,
        notice: 'Test simulation successful',
      };

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockAlertResult,
      });

      const res = await api.sendTestAlert({
        channel: 'email',
        recipient: 'operator@aquora.internal',
        water_body_name: 'Cascade Canyon River',
        safe_simulation_only: true,
      });
      expect(res.status).toBe('DELIVERED');
      expect(res.confirmed_by_provider).toBe(true);
    });
  });

  describe('Environmental Pipeline Audit API', () => {
    it('retrieves real environmental audit status and telemetry', async () => {
      const mockAudit: EnvironmentalPipelineAuditResponse = {
        station_id: 2,
        station_name: 'Cascade Canyon River',
        water_body_type: 'river',
        latitude: 37.77,
        longitude: -122.41,
        audit_timestamp: '2026-10-19T10:00:00Z',
        data_freshness: '12m ago',
        dimensions: {
          water_level: {
            dimension: 'water_level',
            status: 'AVAILABLE_LIVE',
            value: 4.82,
            units: 'meters',
          },
        },
        available_dimensions_count: 1,
        unavailable_dimensions_count: 0,
        ethical_data_notice: 'Zero fabrication guarantee',
      };

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockAudit,
      });

      const audit = await api.getEnvironmentalPipelineAudit(2);
      expect(audit.station_name).toBe('Cascade Canyon River');
      expect(audit.dimensions.water_level.status).toBe('AVAILABLE_LIVE');
      expect(audit.dimensions.water_level.value).toBe(4.82);
    });
  });

  describe('Offline Fallback Contract Integrity', () => {
    it('provides clean demo dashboard structure for offline emergency fallback', () => {
      expect(DEMO_DASHBOARD).toBeDefined();
      expect(DEMO_DASHBOARD.total_monitored_sites).toBeGreaterThan(0);
      expect(DEMO_DASHBOARD.high_risk_sites_count).toBeGreaterThanOrEqual(0);
      expect(DEMO_DASHBOARD.recent_alerts).toBeInstanceOf(Array);
      expect(DEMO_WATER_BODIES.length).toBeGreaterThan(0);
    });
  });
});
