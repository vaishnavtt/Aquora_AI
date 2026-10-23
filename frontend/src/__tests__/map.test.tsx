// @vitest-environment happy-dom
import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  MapSection,
  isValidCoordinate,
  isKeralaCoordinate,
  normalizeRiskLevel,
  getRiskStyle,
  KERALA_CENTER,
  KERALA_DEFAULT_ZOOM,
} from '../components/MapSection';
import { DEMO_WATER_BODIES } from '../services/api';
import { WaterBody } from '../types';

// Mock Leaflet methods to work in happy-dom environment
vi.mock('leaflet', () => {
  const dummyLayer = {
    addTo: vi.fn().mockReturnThis(),
    remove: vi.fn(),
    on: vi.fn().mockReturnThis(),
    clearLayers: vi.fn(),
    addLayer: vi.fn(),
  };

  const dummyMarker = {
    addTo: vi.fn().mockReturnThis(),
    bindPopup: vi.fn().mockReturnThis(),
    openPopup: vi.fn().mockReturnThis(),
    closePopup: vi.fn().mockReturnThis(),
    isPopupOpen: vi.fn().mockReturnValue(false),
    on: vi.fn().mockReturnThis(),
  };

  const dummyMap = {
    setView: vi.fn().mockReturnThis(),
    panTo: vi.fn().mockReturnThis(),
    fitBounds: vi.fn().mockReturnThis(),
    zoomIn: vi.fn().mockReturnThis(),
    zoomOut: vi.fn().mockReturnThis(),
    remove: vi.fn(),
    removeLayer: vi.fn(),
    invalidateSize: vi.fn(),
    on: vi.fn().mockReturnThis(),
  };

  return {
    default: {
      map: vi.fn().mockReturnValue(dummyMap),
      tileLayer: vi.fn().mockReturnValue(dummyLayer),
      layerGroup: vi.fn().mockReturnValue(dummyLayer),
      marker: vi.fn().mockReturnValue(dummyMarker),
      divIcon: vi.fn().mockReturnValue({}),
      latLngBounds: vi.fn().mockReturnValue({}),
      circle: vi.fn().mockReturnValue(dummyLayer),
    },
    map: vi.fn().mockReturnValue(dummyMap),
    tileLayer: vi.fn().mockReturnValue(dummyLayer),
    layerGroup: vi.fn().mockReturnValue(dummyLayer),
    marker: vi.fn().mockReturnValue(dummyMarker),
    divIcon: vi.fn().mockReturnValue({}),
    latLngBounds: vi.fn().mockReturnValue({}),
    circle: vi.fn().mockReturnValue(dummyLayer),
  };
});

// Configure React act environment for happy-dom
// @ts-ignore
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

// Mock ResizeObserver for happy-dom
globalThis.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as any;

describe('AQUORA AI OpenStreetMap + Leaflet Integration Suite', () => {
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

  describe('1. Geospatial Coordinate Validation', () => {
    it('accepts authentic Kerala geographic coordinates', () => {
      // Ramamangalam Bridge
      expect(isValidCoordinate(9.9482, 76.5412)).toBe(true);
      // Athirappilly Waterfalls
      expect(isValidCoordinate(10.2851, 76.5698)).toBe(true);
      // Kerala geographic center
      expect(isValidCoordinate(KERALA_CENTER[0], KERALA_CENTER[1])).toBe(true);
    });

    it('identifies Kerala boundary coordinates correctly', () => {
      expect(isKeralaCoordinate(9.9482, 76.5412)).toBe(true); // Ramamangalam Bridge
      expect(isKeralaCoordinate(10.2851, 76.5698)).toBe(true); // Athirappilly
      expect(isKeralaCoordinate(37.7749, -122.4194)).toBe(false); // San Francisco
    });

    it('rejects invalid, null, undefined, and non-numeric coordinates', () => {
      expect(isValidCoordinate(null, 76.5)).toBe(false);
      expect(isValidCoordinate(10.5, undefined)).toBe(false);
      expect(isValidCoordinate(NaN, 76.5)).toBe(false);
      expect(isValidCoordinate(10.5, NaN)).toBe(false);
      expect(isValidCoordinate('10.5', '76.5')).toBe(false);
      expect(isValidCoordinate(95.0, 76.5)).toBe(false); // Latitude > 90
      expect(isValidCoordinate(-95.0, 76.5)).toBe(false); // Latitude < -90
      expect(isValidCoordinate(10.5, 195.0)).toBe(false); // Longitude > 180
    });
  });

  describe('2. Risk Classification & Hex Color Standard Compliance', () => {
    it('normalizes risk levels according to AQUORA AI hazard specifications', () => {
      expect(normalizeRiskLevel('low')).toBe('LOW');
      expect(normalizeRiskLevel('LOW')).toBe('LOW');
      expect(normalizeRiskLevel('moderate')).toBe('MEDIUM');
      expect(normalizeRiskLevel('medium')).toBe('MEDIUM');
      expect(normalizeRiskLevel('high')).toBe('HIGH');
      expect(normalizeRiskLevel('extreme')).toBe('HIGH');
      expect(normalizeRiskLevel('very high')).toBe('HIGH');
      expect(normalizeRiskLevel(null)).toBe('NO_PREDICTION');
      expect(normalizeRiskLevel(undefined)).toBe('NO_PREDICTION');
      expect(normalizeRiskLevel('unknown')).toBe('NO_PREDICTION');
    });

    it('enforces exact hex colors for LOW, MEDIUM, HIGH, and UNASSESSED risk', () => {
      // LOW: green (#16a34a)
      const lowStyle = getRiskStyle('low');
      expect(lowStyle.hex).toBe('#16a34a');
      expect(lowStyle.category).toBe('LOW');

      // MEDIUM: amber (#f59e0b)
      const medStyle = getRiskStyle('moderate');
      expect(medStyle.hex).toBe('#f59e0b');
      expect(medStyle.category).toBe('MEDIUM');

      // HIGH: red (#dc2626)
      const highStyle = getRiskStyle('high');
      expect(highStyle.hex).toBe('#dc2626');
      expect(highStyle.category).toBe('HIGH');

      // NO PREDICTION: slate (#94a3b8)
      const unassessedStyle = getRiskStyle(null);
      expect(unassessedStyle.hex).toBe('#94a3b8');
      expect(unassessedStyle.category).toBe('NO_PREDICTION');
      expect(unassessedStyle.label).toBe('NO PREDICTION AVAILABLE');
    });
  });

  describe('3. MapSection Component Rendering & OpenStreetMap Attribution', () => {
    it('renders Header with exact title "Kerala Water Risk Intelligence Map"', () => {
      const handleSelect = vi.fn();

      act(() => {
        root!.render(
          <MapSection
            waterBodies={DEMO_WATER_BODIES}
            selectedStation={DEMO_WATER_BODIES[0]}
            onSelectStation={handleSelect}
          />
        );
      });

      expect(container?.textContent).toContain('Kerala Water Risk Intelligence Map');
      expect(container?.textContent).toContain('OpenStreetMap Standard');
      expect(container?.textContent).toContain('Geospatial waterways, river telemetry stations');
    });

    it('renders OpenStreetMap raster layer switcher options (OSM, Dark, Topo)', () => {
      act(() => {
        root!.render(
          <MapSection
            waterBodies={DEMO_WATER_BODIES}
            selectedStation={null}
            onSelectStation={vi.fn()}
          />
        );
      });

      expect(container?.textContent).toContain('OSM');
      expect(container?.textContent).toContain('Dark');
      expect(container?.textContent).toContain('Topo');
    });

    it('displays risk statistics and total station count', () => {
      act(() => {
        root!.render(
          <MapSection
            waterBodies={DEMO_WATER_BODIES}
            selectedStation={null}
            onSelectStation={vi.fn()}
          />
        );
      });

      expect(container?.textContent).toContain(`All (${DEMO_WATER_BODIES.length})`);
      expect(container?.textContent).toContain('LOW');
      expect(container?.textContent).toContain('MEDIUM');
      expect(container?.textContent).toContain('HIGH');
      expect(container?.textContent).toContain('HAZARD CLASSIFICATION:');
    });

    it('renders interactive map controls (Zoom in, Zoom out, Reset Kerala, Fit bounds)', () => {
      act(() => {
        root!.render(
          <MapSection
            waterBodies={DEMO_WATER_BODIES}
            selectedStation={null}
            onSelectStation={vi.fn()}
          />
        );
      });

      const buttons = container?.querySelectorAll('button');
      expect(buttons?.length).toBeGreaterThan(6);
      expect(container?.querySelector('button[title*="Zoom In"]')).not.toBeNull();
      expect(container?.querySelector('button[title*="Zoom Out"]')).not.toBeNull();
      expect(container?.querySelector('button[title*="Reset Map View to Kerala"]')).not.toBeNull();
      expect(container?.querySelector('button[title*="Fit All Filtered Stations"]')).not.toBeNull();
    });
  });

  describe('4. Search and Filtering Functionality', () => {
    it('filters stations by aquatic type dropdown', () => {
      act(() => {
        root!.render(
          <MapSection
            waterBodies={DEMO_WATER_BODIES}
            selectedStation={null}
            onSelectStation={vi.fn()}
          />
        );
      });

      const select = container?.querySelector('select');
      expect(select).not.toBeNull();

      act(() => {
        select!.value = 'waterfall';
        select!.dispatchEvent(new Event('change', { bubbles: true }));
      });

      // Athirappilly Waterfalls should be filtered in
      expect(container?.textContent).toContain('Showing 1/');
    });

    it('filters stations by search input query', () => {
      act(() => {
        root!.render(
          <MapSection
            waterBodies={DEMO_WATER_BODIES}
            selectedStation={null}
            onSelectStation={vi.fn()}
          />
        );
      });

      const searchInput = container?.querySelector('input[type="text"]') as HTMLInputElement;
      expect(searchInput).not.toBeNull();

      act(() => {
        const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
        nativeSetter?.call(searchInput, 'Athirappilly');
        searchInput.dispatchEvent(new Event('input', { bubbles: true }));
      });

      expect(container?.textContent).toContain('Showing 1/');
    });

    it('renders empty result overlay when no stations match search query', () => {
      act(() => {
        root!.render(
          <MapSection
            waterBodies={DEMO_WATER_BODIES}
            selectedStation={null}
            onSelectStation={vi.fn()}
          />
        );
      });

      const searchInput = container?.querySelector('input[type="text"]') as HTMLInputElement;

      act(() => {
        const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
        nativeSetter?.call(searchInput, 'NonExistentWaterBodyZone999');
        searchInput.dispatchEvent(new Event('input', { bubbles: true }));
      });

      expect(container?.textContent).toContain('No Monitored Water Bodies Match Filters');
      expect(container?.textContent).toContain('Reset All Filters');
    });

    it('resets all filters when clicking Reset All Filters button', () => {
      act(() => {
        root!.render(
          <MapSection
            waterBodies={DEMO_WATER_BODIES}
            selectedStation={null}
            onSelectStation={vi.fn()}
          />
        );
      });

      const searchInput = container?.querySelector('input[type="text"]') as HTMLInputElement;

      act(() => {
        const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
        nativeSetter?.call(searchInput, 'NonExistent');
        searchInput.dispatchEvent(new Event('input', { bubbles: true }));
      });

      expect(container?.textContent).toContain('No Monitored Water Bodies Match Filters');

      // Click Reset All Filters
      const resetBtn = Array.from(container?.querySelectorAll('button') || []).find((b) =>
        b.textContent?.includes('Reset All Filters')
      );
      expect(resetBtn).not.toBeUndefined();

      act(() => {
        resetBtn?.click();
      });

      expect(container?.textContent).not.toContain('No Monitored Water Bodies Match Filters');
      expect(container?.textContent).toContain(`Showing ${DEMO_WATER_BODIES.length}/${DEMO_WATER_BODIES.length}`);
    });
  });

  describe('5. Error Handling and Data Integrity', () => {
    it('safely handles empty water bodies array without crashing', () => {
      act(() => {
        root!.render(
          <MapSection
            waterBodies={[]}
            selectedStation={null}
            onSelectStation={vi.fn()}
          />
        );
      });

      expect(container?.textContent).toContain('Kerala Water Risk Intelligence Map');
      expect(container?.textContent).toContain('All (0)');
    });

    it('safely rejects stations with NaN or out-of-bounds coordinates', () => {
      const corruptedWaterBodies: WaterBody[] = [
        ...DEMO_WATER_BODIES,
        {
          id: 999,
          name: 'Corrupted Sensor Node',
          type: 'river',
          latitude: NaN,
          longitude: 76.5,
          current_risk_level: 'high',
          risk_score: 90,
          water_temp_c: 20,
          flow_rate_cms: 1,
          depth_meters: 1,
          last_updated: new Date().toISOString(),
          is_demonstration_data: true,
        },
      ];

      act(() => {
        root!.render(
          <MapSection
            waterBodies={corruptedWaterBodies}
            selectedStation={null}
            onSelectStation={vi.fn()}
          />
        );
      });

      // The corrupted item is filtered out from validWaterBodies count
      expect(container?.textContent).toContain(`All (${DEMO_WATER_BODIES.length})`);
    });
  });
});
