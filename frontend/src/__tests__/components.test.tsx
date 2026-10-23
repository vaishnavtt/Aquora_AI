// @vitest-environment happy-dom
import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { WhatIfSimulationPanel } from '../components/WhatIfSimulationPanel';
import { ErrorBanner, EmptyState, LoadingSkeleton } from '../components/States';
import { DEMO_WATER_BODIES } from '../services/api';

// Configure React act environment for happy-dom
// @ts-ignore
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe('AQUORA AI UI Component Integration Suite', () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    if (root && container) {
      act(() => {
        root!.unmount();
      });
      container.remove();
    }
    container = null;
    root = null;
    vi.restoreAllMocks();
  });

  describe('States Components', () => {
    it('renders ErrorBanner with retry trigger', () => {
      const handleRetry = vi.fn();
      act(() => {
        root!.render(
          <ErrorBanner message="Hydrodynamic service unavailable" onRetry={handleRetry} />
        );
      });

      expect(container?.textContent).toContain('Hydrodynamic service unavailable');
      const retryBtn = container?.querySelector('button');
      expect(retryBtn).not.toBeNull();
      act(() => {
        retryBtn?.click();
      });
      expect(handleRetry).toHaveBeenCalledTimes(1);
    });

    it('renders EmptyState when filtered stations return 0 items', () => {
      const handleReset = vi.fn();
      act(() => {
        root!.render(<EmptyState searchTerm="Atlantis" onReset={handleReset} />);
      });

      expect(container?.textContent).toContain('No locations found');
      expect(container?.textContent).toContain('Atlantis');
      expect(container?.textContent).toContain('Clear search');
    });

    it('renders LoadingSkeleton during active async fetches', () => {
      act(() => {
        root!.render(<LoadingSkeleton />);
      });

      const animatedElements = container?.querySelectorAll('.animate-pulse');
      expect(animatedElements?.length).toBeGreaterThan(0);
    });
  });

  describe('WhatIfSimulationPanel Integration', () => {
    it('mounts with selected station and telemetry sliders', () => {
      const station = DEMO_WATER_BODIES[0];

      act(() => {
        root!.render(<WhatIfSimulationPanel selectedStation={station} />);
      });

      expect(container?.textContent).toContain('Interactive What-If Scenario Simulator');
      expect(container?.textContent).toContain('Additional 24h Rainfall');
      expect(container?.textContent).toContain('Water Level Stage Delta');
      expect(container?.textContent).toContain('Additional River Discharge');
      expect(container?.textContent).toContain('Exposure & Access Condition');
    });

    it('displays dynamic model version, scenario banner, and scientific disclaimer notice', () => {
      const station = DEMO_WATER_BODIES[0];

      act(() => {
        root!.render(<WhatIfSimulationPanel selectedStation={station} />);
      });

      expect(container?.textContent).toContain('HYPOTHETICAL LAB');
      expect(container?.textContent).toContain('Adjust Scenario Variables');
      expect(container?.textContent).toContain('Hypothetical scenarios are strictly distinct from verified telemetry observations');
    });
  });

  describe('Data Integrity & Fallback Regression Tests', () => {
    it('RestrainedGauge safely renders unrated and unavailable states when score and confidence are missing', async () => {
      const { RestrainedGauge } = await import('../components/ops/RestrainedGauge');

      act(() => {
        root!.render(<RestrainedGauge score={null} level={null} confidence={null} />);
      });

      expect(container?.textContent).toContain('—');
      expect(container?.textContent).toContain('Unrated');
      expect(container?.textContent).toContain('Unavailable');
      expect(container?.textContent).not.toContain('NaN');
      expect(container?.textContent).not.toContain('94.2%');
    });

    it('RestrainedGauge correctly displays calibrated score and confidence when provided', async () => {
      const { RestrainedGauge } = await import('../components/ops/RestrainedGauge');

      act(() => {
        root!.render(<RestrainedGauge score={87} level="extreme" confidence={91.4} />);
      });

      expect(container?.textContent).toContain('87');
      expect(container?.textContent).toContain('EXTREME');
      expect(container?.textContent).toContain('91.4%');
    });

    it('OperationalWhatIfPanel distinguishes unrated baseline and does not silently substitute 47', async () => {
      const { OperationalWhatIfPanel } = await import('../components/ops/OperationalWhatIfPanel');
      const unratedStation = {
        id: 99,
        name: 'Uncalibrated Test Pond',
        type: 'lake',
        latitude: 10.0,
        longitude: 76.5,
        current_risk_level: 'low' as const,
        current_risk_score: null as any,
        risk_score: null as any,
        depth_meters: 2.0,
        flow_rate_cms: 0.1,
        water_temp_c: 24.0,
        created_at: '2026-01-01',
      };

      act(() => {
        root!.render(<OperationalWhatIfPanel selectedStation={unratedStation as unknown as any} />);
      });

      expect(container?.textContent).toContain('Baseline risk');
      expect(container?.textContent).toContain('—');
      expect(container?.textContent).toContain('Awaiting baseline');
      expect(container?.textContent).toContain('Baseline risk score is unrated for this station');
      expect(container?.textContent).not.toContain('47');
    });

    it('ExposureRiskPanel displays honest Unavailable and Not Monitored labels for missing telemetry', async () => {
      const { ExposureRiskPanel } = await import('../components/ops/ExposureRiskPanel');
      const sparseStation = {
        id: 101,
        name: 'Sparse Telemetry Gauge',
        type: 'river',
        latitude: 9.8,
        longitude: 76.4,
        current_risk_level: 'low' as const,
        current_risk_score: null as any,
        risk_score: null as any,
        current_water_level_m: null as any,
        depth_meters: null as any,
        flow_velocity_mps: null as any,
        flow_rate_cms: null as any,
        discharge_cms: null as any,
        water_temp_c: null as any,
        rainfall_rate_mmh: null as any,
        humidity_pct: null as any,
        wind_kmh: null as any,
        model_confidence: null as any,
        env_hazard_score: null as any,
        hydrodynamic_score: null as any,
        elevation_m: null as any,
        elevation_meters: null as any,
        created_at: '2026-01-01',
      };

      act(() => {
        root!.render(<ExposureRiskPanel station={sparseStation as unknown as any} onRunScenario={vi.fn()} />);
      });

      expect(container?.textContent).toContain('Elevation Unavailable');
      expect(container?.textContent).toContain('Unrecorded');
      expect(container?.textContent).toContain('Not Monitored');
      expect(container?.textContent).toContain('Uncalibrated');
      expect(container?.textContent).not.toContain('0.00 m');
      expect(container?.textContent).not.toContain('NaN');
    });

    it('AllLocationsDirectory renders uncalibrated and not monitored indicators instead of multipliers', async () => {
      const { AllLocationsDirectory } = await import('../components/ops/AllLocationsDirectory');
      const sparseStation = {
        id: 102,
        name: 'Sparse Sensor Station',
        type: 'river',
        latitude: 9.85,
        longitude: 76.45,
        current_risk_level: 'low' as const,
        current_risk_score: null as any,
        risk_score: null as any,
        current_water_level_m: null as any,
        depth_meters: null as any,
        normal_water_level_m: null as any,
        flow_velocity_mps: null as any,
        flow_rate_cms: null as any,
        discharge_cms: null as any,
        elevation_m: null as any,
        elevation_meters: null as any,
        water_temp_c: 24.0,
        created_at: '2026-01-01',
      };

      act(() => {
        root!.render(
          <AllLocationsDirectory
            waterBodies={[sparseStation as unknown as any]}
            selectedStation={null}
            onSelectStation={vi.fn()}
          />
        );
      });

      expect(container?.textContent).toContain('Normal: Uncalibrated');
      expect(container?.textContent).toContain('Not Monitored');
      expect(container?.textContent).toContain('Unavailable');
    });

    it('RiskHistoryChart displays honest unavailable state when risk score is unrated', async () => {
      const { RiskHistoryChart } = await import('../components/ops/RiskHistoryChart');
      const unratedStation = {
        id: 103,
        name: 'Unrated Basin Gauge',
        type: 'river',
        latitude: 9.9,
        longitude: 76.5,
        current_risk_level: 'low' as const,
        current_risk_score: null as any,
        risk_score: null as any,
        current_water_level_m: null as any,
        depth_meters: 2.0,
        flow_rate_cms: 1.0,
        water_temp_c: 24.0,
        created_at: '2026-01-01',
      };

      act(() => {
        root!.render(<RiskHistoryChart station={unratedStation as unknown as any} />);
      });

      expect(container?.textContent).toContain('Continuous 24-hour telemetry trajectory is unrated');
      expect(container?.textContent).toContain('Telemetry Pending');
      expect(container?.textContent).not.toContain('92');
    });

    it('OperationalWhatIfPanel displays explicit experimental disclaimer and sensitivity calculations', async () => {
      const { OperationalWhatIfPanel } = await import('../components/ops/OperationalWhatIfPanel');
      const ratedStation = {
        id: 104,
        name: 'Athirappilly Cascade Station',
        type: 'waterfall',
        latitude: 10.28,
        longitude: 76.56,
        current_risk_level: 'high' as const,
        current_risk_score: 75,
        risk_score: 75,
        current_water_level_m: 3.2,
        water_temp_c: 22.0,
        depth_meters: 4.5,
        flow_rate_cms: 8.0,
        created_at: '2026-01-01',
      };

      act(() => {
        root!.render(<OperationalWhatIfPanel selectedStation={ratedStation as unknown as any} />);
      });

      expect(container?.textContent).toContain('Athirappilly Cascade Station');
      expect(container?.textContent).toContain('Baseline risk');
      expect(container?.textContent).toContain('75');
      expect(container?.textContent).toContain('Experimental Operational Stress-Test Tool');
      expect(container?.textContent).toContain('Exploratory scenario simulation tool, not a certified hydrodynamic forecast');
      expect(container?.textContent).not.toContain('calibrated Kerala Random Forest hydro-coefficients');
    });
  });
});
