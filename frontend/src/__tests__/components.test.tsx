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

      expect(container?.textContent).toContain('No Monitored Stations Found');
      expect(container?.textContent).toContain('Atlantis');
      expect(container?.textContent).toContain('Reset Filter Criteria');
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
});
