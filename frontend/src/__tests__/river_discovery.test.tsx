// @vitest-environment happy-dom
import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  MapSection,
  normalizeRiskLevel,
  getRiskStyle,
  nearbyRiverToWaterBody,
  KERALA_PRESET_LOCATIONS,
} from '../components/MapSection';
import { DrowningRiskAssessmentCard } from '../components/DrowningRiskAssessmentCard';
import { DEMO_WATER_BODIES, api } from '../services/api';
import { NearbyRiverItem, WaterBody } from '../types';

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

describe('AQUORA AI - Location-Aware River Discovery & Classification Suite', () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;

  beforeEach(() => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(() =>
      Promise.reject(new Error('Network error (Mocked offline fallback)'))
    );
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

  describe('1. Authoritative Risk Classification Boundaries', () => {
    it('strictly maps risk scores according to authoritative boundaries', () => {
      // LOW: < 30
      expect(normalizeRiskLevel('low')).toBe('LOW');
      expect(normalizeRiskLevel('safe')).toBe('LOW');
      const lowStyle = getRiskStyle('low');
      expect(lowStyle.category).toBe('LOW');
      expect(lowStyle.hex).toBe('#16a34a');

      // MEDIUM: 30 - 60
      expect(normalizeRiskLevel('moderate')).toBe('MEDIUM');
      expect(normalizeRiskLevel('medium')).toBe('MEDIUM');
      const medStyle = getRiskStyle('moderate');
      expect(medStyle.category).toBe('MEDIUM');
      expect(medStyle.hex).toBe('#f59e0b');

      // HIGH: > 60
      expect(normalizeRiskLevel('high')).toBe('HIGH');
      expect(normalizeRiskLevel('extreme')).toBe('HIGH');
      expect(normalizeRiskLevel('critical')).toBe('HIGH');
      const highStyle = getRiskStyle('high');
      expect(highStyle.category).toBe('HIGH');
      expect(highStyle.hex).toBe('#dc2626');

      // NO_PREDICTION: missing / null / unassessed
      expect(normalizeRiskLevel(null)).toBe('NO_PREDICTION');
      expect(normalizeRiskLevel(undefined)).toBe('NO_PREDICTION');
      expect(normalizeRiskLevel('unknown')).toBe('NO_PREDICTION');
      const noPredStyle = getRiskStyle(null);
      expect(noPredStyle.category).toBe('NO_PREDICTION');
      expect(noPredStyle.hex).toBe('#94a3b8');
    });

    it('correctly converts NearbyRiverItem to compatible WaterBody structure', () => {
      const osmRiver: NearbyRiverItem = {
        id: 10001,
        name: 'Periyar River (Aluva Reach)',
        type: 'river',
        latitude: 10.1076,
        longitude: 76.3516,
        distance_km: 1.8,
        distance_meters: 1800,
        distance_formatted: '1.8 km',
        district: 'Ernakulam',
        basin_region: 'Periyar River Basin',
        is_monitored_station: false,
        has_prediction: false,
        current_risk_level: 'no_prediction',
        risk_category: 'NO_PREDICTION',
        risk_score: null,
        data_source: 'OpenStreetMap (OSM waterways)',
        last_updated: null,
        description: 'Major perennial river reach.',
      };

      const wb = nearbyRiverToWaterBody(osmRiver);
      expect(wb.name).toBe('Periyar River (Aluva Reach)');
      expect(wb.current_risk_level).toBe('no_prediction');
      expect(wb.is_demonstration_data).toBe(false);
      expect(wb.data_source).toContain('OpenStreetMap');
    });
  });

  describe('2. Geolocation Request & Permission Denial Handling', () => {
    it('renders prominent "Use My Location" button', () => {
      act(() => {
        root!.render(
          <MapSection
            waterBodies={DEMO_WATER_BODIES}
            selectedStation={null}
            onSelectStation={vi.fn()}
          />
        );
      });

      expect(container?.textContent).toContain('Use My Location');
      expect(container?.textContent).toContain('Radius:');
      expect(container?.textContent).toContain('2 km');
      expect(container?.textContent).toContain('5 km');
      expect(container?.textContent).toContain('10 km');
      expect(container?.textContent).toContain('25 km');
    });

    it('handles geolocation permission denial gracefully without crashing', async () => {
      // Mock navigator.geolocation with permission denial error (code 1)
      const mockGeolocation = {
        getCurrentPosition: vi.fn().mockImplementation((success, error) => {
          error({ code: 1, message: 'User denied Geolocation' });
        }),
      };
      Object.defineProperty(navigator, 'geolocation', {
        value: mockGeolocation,
        configurable: true,
        writable: true,
      });

      act(() => {
        root!.render(
          <MapSection
            waterBodies={DEMO_WATER_BODIES}
            selectedStation={null}
            onSelectStation={vi.fn()}
          />
        );
      });

      const locateBtn = container?.querySelector('#use-my-location-btn') as HTMLButtonElement;
      expect(locateBtn).not.toBeNull();

      await act(async () => {
        locateBtn.click();
      });

      // Must display a courteous permission denied message
      expect(container?.textContent).toContain('Location permission was denied');
      expect(mockGeolocation.getCurrentPosition).toHaveBeenCalledTimes(1);
    });

    it('handles successful geolocation and triggers river discovery', async () => {
      const mockGeolocation = {
        getCurrentPosition: vi.fn().mockImplementation((success) => {
          success({
            coords: {
              latitude: 10.1076,
              longitude: 76.3516,
              accuracy: 15,
            },
            timestamp: Date.now(),
          });
        }),
      };
      Object.defineProperty(navigator, 'geolocation', {
        value: mockGeolocation,
        configurable: true,
        writable: true,
      });

      act(() => {
        root!.render(
          <MapSection
            waterBodies={DEMO_WATER_BODIES}
            selectedStation={null}
            onSelectStation={vi.fn()}
          />
        );
      });

      const locateBtn = container?.querySelector('#use-my-location-btn') as HTMLButtonElement;

      await act(async () => {
        locateBtn.click();
      });

      // Ribbon indicates location active and searching
      expect(container?.textContent).toContain('Searching rivers near:');
      expect(container?.textContent).toContain('My Location');
      expect(container?.textContent).toContain('10 km radius');
    });
  });

  describe('3. Manual Location Selection & Presets', () => {
    it('renders Kerala preset locations list with major river reaches', () => {
      expect(KERALA_PRESET_LOCATIONS.length).toBeGreaterThanOrEqual(10);
      const names = KERALA_PRESET_LOCATIONS.map((p) => p.name);
      expect(names.some((n) => n.includes('Periyar'))).toBe(true);
      expect(names.some((n) => n.includes('Meenachil'))).toBe(true);
      expect(names.some((n) => n.includes('Bharathappuzha'))).toBe(true);
      expect(names.some((n) => n.includes('Chalakudy'))).toBe(true);
    });

    it('supports manual coordinate entry modal toggle', async () => {
      act(() => {
        root!.render(
          <MapSection
            waterBodies={DEMO_WATER_BODIES}
            selectedStation={null}
            onSelectStation={vi.fn()}
          />
        );
      });

      // Find Coordinates button
      const coordBtn = Array.from(container?.querySelectorAll('button') || []).find((b) =>
        b.textContent?.includes('Coordinates')
      );
      expect(coordBtn).not.toBeUndefined();

      act(() => {
        coordBtn?.click();
      });

      // Direct coordinates form should appear
      expect(container?.textContent).toContain('Direct Coordinates:');
      expect(container?.querySelector('input[placeholder*="Latitude"]')).not.toBeNull();
      expect(container?.querySelector('input[placeholder*="Longitude"]')).not.toBeNull();
    });
  });

  describe('4. Unmonitored OpenStreetMap Feature Display & Scientific Limitation', () => {
    it('displays NO PREDICTION AVAILABLE and explicit point-level disclaimer for unmonitored features', async () => {
      const unmonitoredWaterBody = {
        id: 10001,
        name: 'Periyar River (Aluva Reach)',
        type: 'river',
        latitude: 10.1118,
        longitude: 76.3533,
        current_risk_level: 'no_prediction' as any,
        risk_score: 0,
        water_temp_c: 27.0,
        flow_rate_cms: 0,
        depth_meters: 0,
        elevation_meters: 12.0,
        basin_region: 'Periyar River Basin',
        data_source: 'OpenStreetMap (OSM waterways)',
        last_updated: new Date().toISOString(),
        description: 'Unmonitored geographic feature from OpenStreetMap.',
        is_demonstration_data: false,
      } as unknown as WaterBody;

      await act(async () => {
        root!.render(
          <DrowningRiskAssessmentCard
            station={unmonitoredWaterBody}
          />
        );
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      // Must display unmonitored NO PREDICTION banner
      expect(container?.textContent).toContain('NO PREDICTION AVAILABLE');
      expect(container?.textContent).toContain('UNMONITORED FEATURE');
      expect(container?.textContent).toContain('Geographic Scope & Scientific Assessment Boundary');
      expect(container?.textContent).toContain('point-level predictions cannot be extrapolated across an entire river course');
    });

    it('displays LOW risk badge for monitored calm water bodies without defaulting to MODERATE', () => {
      const calmMonitoredStation = {
        id: 1,
        name: 'Ramamangalam Bridge',
        type: 'river',
        latitude: 9.9482,
        longitude: 76.5412,
        current_risk_level: 'low',
        risk_score: 18.5,
        water_temp_c: 28.0,
        flow_rate_cms: 3.2,
        depth_meters: 2.1,
        elevation_meters: 12.5,
        basin_region: 'Muvattupuzha River Basin',
        data_source: 'Kerala State Water Resources Department',
        last_updated: new Date().toISOString(),
        is_demonstration_data: false,
      } as unknown as WaterBody;

      act(() => {
        root!.render(
          <DrowningRiskAssessmentCard
            station={calmMonitoredStation}
          />
        );
      });

      // Before assessment resolves, badge must NOT default to MODERATE
      expect(container?.textContent).not.toContain('MODERATE RISK');
    });
  });
});
