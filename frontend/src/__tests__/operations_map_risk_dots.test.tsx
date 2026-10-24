// @vitest-environment happy-dom
import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  OperationsMap,
  createDotPopupHtml,
  isStationFeatureMatch,
  RISK_CONFIG,
  RISK_DOT_COLORS,
} from '../components/ops/OperationsMap';
import { WaterbodyFeature, WaterBody, HazardAssessmentResult } from '../types';

// Mock API functions
const mockViewportFeatures: WaterbodyFeature[] = [
  {
    id: 101,
    external_id: 'wb-green-1',
    name: 'Aluva Periyar Regulated Canal',
    type: 'canal',
    geometry_type: 'LineString',
    geometry: { type: 'LineString', coordinates: [[76.3533, 10.1118], [76.3550, 10.1130]] },
    district: 'Ernakulam',
    basin_region: 'Periyar',
    centroid_lat: 10.1118,
    centroid_lon: 76.3533,
    bbox: [10.1118, 76.3533, 10.1130, 76.3550],
    data_source: 'Kerala State Water Resources',
    license: 'ODbL',
    data_quality: 'verified_spatial_feature',
    is_monitored_station: true,
    hazard_category: 'LOW_OBSERVED_HAZARD',
    contributing_indicators: ['stage_nominal', 'discharge_low'],
    missing_factors: [],
    rule_summary: 'Low observed hydrodynamic hazard: Active streamgage indicates nominal stage and low discharge velocity (<10 cms). NOTICE: Does NOT guarantee swimming safety.',
    description: 'Regulated canal section in Aluva with low velocity.',
    disclaimer: 'Hydrodynamic preliminary assessment only.',
  },
  {
    id: 102,
    external_id: 'wb-yellow-2',
    name: 'Meenachil River (Pala Station Reach)',
    type: 'river',
    geometry_type: 'LineString',
    geometry: { type: 'LineString', coordinates: [[76.6840, 9.7110], [76.6850, 9.7120]] },
    district: 'Kottayam',
    basin_region: 'Meenachil',
    centroid_lat: 9.7110,
    centroid_lon: 76.6840,
    bbox: [9.7110, 76.6840, 9.7120, 76.6850],
    data_source: 'Central Water Commission (CWC)',
    license: 'ODbL',
    data_quality: 'verified_spatial_feature',
    is_monitored_station: true,
    hazard_category: 'MODERATE_HAZARD',
    contributing_indicators: ['perennial_flow', 'depth_variation'],
    missing_factors: [],
    rule_summary: 'Provisional estimate: Moderate risk assigned due to major perennial river flow, variable depth across scour pools, and seasonal current fluctuations.',
    description: 'Main stem river reach through Pala town with scour pools.',
    disclaimer: 'Hydrodynamic preliminary assessment only.',
  },
  {
    id: 103,
    external_id: 'wb-red-3',
    name: 'Vadavathoor Abandoned Granite Quarry',
    type: 'quarry',
    geometry_type: 'Polygon',
    geometry: { type: 'Polygon', coordinates: [[[76.56, 9.59], [76.57, 9.59], [76.57, 9.60], [76.56, 9.60], [76.56, 9.59]]] },
    district: 'Kottayam',
    basin_region: 'Meenachil',
    centroid_lat: 9.5950,
    centroid_lon: 76.5650,
    bbox: [9.5900, 76.5600, 9.6000, 76.5700],
    data_source: 'Kerala Mining & Geology',
    license: 'ODbL',
    data_quality: 'verified_spatial_feature',
    is_monitored_station: false,
    hazard_category: 'HIGH_HAZARD',
    contributing_indicators: ['vertical_drop_offs', 'cold_thermocline'],
    missing_factors: [],
    rule_summary: 'Provisional estimate: High risk assigned due to deep abandoned quarry with sheer vertical drop-offs, cold thermocline, and absence of egress footholds.',
    description: 'Deep quarry excavation with sheer vertical drop-offs.',
    disclaimer: 'Hydrodynamic preliminary assessment only.',
  },
  {
    id: 104,
    external_id: 'wb-grey-4',
    name: 'Unmonitored Tributary Stream Reach',
    type: 'river',
    geometry_type: 'LineString',
    geometry: { type: 'LineString', coordinates: [[76.40, 10.20], [76.42, 10.22]] },
    district: 'Ernakulam',
    basin_region: 'Periyar',
    centroid_lat: 10.2050,
    centroid_lon: 76.4100,
    bbox: [10.2000, 76.4000, 10.2200, 76.4200],
    data_source: 'OpenStreetMap Contributors',
    license: 'ODbL',
    data_quality: 'verified_spatial_feature',
    is_monitored_station: false,
    hazard_category: 'INSUFFICIENT_DATA',
    contributing_indicators: [],
    missing_factors: ['stage_telemetry', 'flow_velocity_sensor'],
    rule_summary: 'Insufficient empirical data: This waterbody reach has no active hydrological telemetry station, depth sounding, or flow sensor installed. Unassessed features are strictly NOT labeled low risk.',
    description: 'Unmonitored natural stream reach.',
    disclaimer: 'Hydrodynamic preliminary assessment only.',
  },
];

vi.mock('../services/api', () => ({
  fetchWaterbodiesInViewport: vi.fn().mockImplementation(() =>
    Promise.resolve({
      total_features: mockViewportFeatures.length,
      returned_features: mockViewportFeatures.length,
      bbox: [8.15, 74.75, 12.90, 77.60],
      features: mockViewportFeatures,
      dataset_attribution: 'OpenStreetMap Contributors (ODbL)',
      coverage_notes: 'Mapped waterbodies.',
    })
  ),
  searchWaterbodyFeatures: vi.fn().mockResolvedValue([]),
  fetchHazardAssessment: vi.fn().mockImplementation((id: number) => {
    const feat = mockViewportFeatures.find((f) => f.id === id);
    if (!feat) return Promise.reject(new Error('Not found'));
    const assessment: HazardAssessmentResult = {
      waterbody_id: feat.id,
      external_id: feat.external_id,
      waterbody_name: feat.name,
      type: feat.type,
      district: feat.district,
      hazard_category: feat.hazard_category,
      hazard_badge_color: RISK_CONFIG[feat.hazard_category].hex,
      is_provisional: feat.hazard_category !== 'LOW_OBSERVED_HAZARD',
      assessment_basis: feat.hazard_category === 'LOW_OBSERVED_HAZARD' ? 'SUPPORTED_BY_VERIFIED_OBSERVATIONS' : 'PROVISIONAL_ESTIMATE',
      assessment_basis_label: feat.hazard_category === 'LOW_OBSERVED_HAZARD' ? 'Verified Streamgage Telemetry' : 'Provisional estimate (rule-based assumption)',
      contributing_indicators: feat.contributing_indicators.map((ind) => ({
        indicator: ind,
        value: 12.5,
        unit: 'm',
        severity: feat.hazard_category === 'HIGH_HAZARD' ? 'HIGH' : feat.hazard_category === 'MODERATE_HAZARD' ? 'MODERATE' : 'LOW',
        source: 'CWC Gauge',
        observed_at: new Date().toISOString(),
        description: `Verified measurement for ${ind}`,
      })),
      missing_factors: feat.missing_factors,
      stale_factors: [],
      evaluation_rules_applied: [`RULE_${feat.hazard_category}`],
      rule_summary: feat.rule_summary || 'Evidence evaluated.',
      assessment_timestamp: new Date().toISOString(),
      data_source: feat.data_source,
      license: feat.license,
      physical_limitations: 'Preliminary physical factors only.',
      scientific_disclaimer: 'Does not predict human drowning probability. Low risk does not mean safe for swimming.',
    };
    return Promise.resolve(assessment);
  }),
  triggerHazardAssessment: vi.fn().mockImplementation((id: number) => {
    const feat = mockViewportFeatures.find((f) => f.id === id);
    return Promise.resolve({
      waterbody_id: id,
      external_id: feat?.external_id || 'test',
      waterbody_name: feat?.name || 'test',
      type: feat?.type || 'river',
      district: feat?.district || 'Kerala',
      hazard_category: feat?.hazard_category || 'INSUFFICIENT_DATA',
      hazard_badge_color: '#94A3B8',
      contributing_indicators: [],
      missing_factors: [],
      stale_factors: [],
      evaluation_rules_applied: [],
      rule_summary: 'Re-evaluated.',
      assessment_timestamp: new Date().toISOString(),
      data_source: 'Test',
      license: 'ODbL',
      physical_limitations: 'None',
      scientific_disclaimer: 'Notice',
    });
  }),
}));

// Mock Leaflet
const createdMarkers: any[] = [];
vi.mock('leaflet', () => {
  const dummyLayer = {
    addTo: vi.fn().mockReturnThis(),
    remove: vi.fn(),
    on: vi.fn().mockReturnThis(),
    clearLayers: vi.fn(),
    addLayer: vi.fn(),
  };

  const dummyMap = {
    setView: vi.fn().mockReturnThis(),
    panTo: vi.fn().mockReturnThis(),
    fitBounds: vi.fn().mockReturnThis(),
    flyTo: vi.fn().mockReturnThis(),
    zoomIn: vi.fn().mockReturnThis(),
    zoomOut: vi.fn().mockReturnThis(),
    remove: vi.fn(),
    removeLayer: vi.fn(),
    invalidateSize: vi.fn(),
    getBounds: vi.fn().mockReturnValue({
      getSouth: () => 8.15,
      getNorth: () => 12.90,
      getWest: () => 74.75,
      getEast: () => 77.60,
    }),
    on: vi.fn().mockReturnThis(),
    off: vi.fn().mockReturnThis(),
    eachLayer: vi.fn(),
  };

  const createMarkerMock = (coords: any, options: any) => {
    let boundPopupContent = '';
    let popupOpen = false;
    const listeners: Record<string, Function[]> = {};

    const markerObj = {
      coords,
      options,
      addTo: vi.fn().mockReturnThis(),
      bindPopup: vi.fn().mockImplementation((html: string) => {
        boundPopupContent = html;
        return markerObj;
      }),
      setPopupContent: vi.fn().mockImplementation((html: string) => {
        boundPopupContent = html;
        return markerObj;
      }),
      openPopup: vi.fn().mockImplementation(() => {
        popupOpen = true;
        return markerObj;
      }),
      closePopup: vi.fn().mockImplementation(() => {
        popupOpen = false;
        return markerObj;
      }),
      isPopupOpen: vi.fn().mockImplementation(() => popupOpen),
      setStyle: vi.fn().mockImplementation((newOpts: any) => {
        Object.assign(options, newOpts);
        return markerObj;
      }),
      on: vi.fn().mockImplementation((event: string, handler: Function) => {
        listeners[event] = listeners[event] || [];
        listeners[event].push(handler);
        return markerObj;
      }),
      _trigger: (event: string) => {
        (listeners[event] || []).forEach((cb) => cb());
      },
      _getPopupContent: () => boundPopupContent,
    };
    createdMarkers.push(markerObj);
    return markerObj;
  };

  return {
    default: {
      map: vi.fn().mockReturnValue(dummyMap),
      tileLayer: vi.fn().mockReturnValue(dummyLayer),
      layerGroup: vi.fn().mockReturnValue(dummyLayer),
      marker: vi.fn().mockImplementation(createMarkerMock),
      circleMarker: vi.fn().mockImplementation(createMarkerMock),
      divIcon: vi.fn().mockReturnValue({}),
      latLngBounds: vi.fn().mockReturnValue({}),
      circle: vi.fn().mockReturnValue(dummyLayer),
    },
    map: vi.fn().mockReturnValue(dummyMap),
    tileLayer: vi.fn().mockReturnValue(dummyLayer),
    layerGroup: vi.fn().mockReturnValue(dummyLayer),
    marker: vi.fn().mockImplementation(createMarkerMock),
    circleMarker: vi.fn().mockImplementation(createMarkerMock),
    divIcon: vi.fn().mockReturnValue({}),
    latLngBounds: vi.fn().mockReturnValue({}),
    circle: vi.fn().mockReturnValue(dummyLayer),
  };
});

// Configure React act environment
// @ts-ignore
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

// Mock ResizeObserver
globalThis.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as any;

describe('OperationsMap — Clickable Waterbody Risk Dots Test Suite', () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;

  beforeEach(() => {
    createdMarkers.length = 0;
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

  describe('1. Risk Color and Label Consistency (Task 1 & Task 2)', () => {
    it('uses exact required risk colors consistently across LOW, MODERATE, HIGH, and INSUFFICIENT DATA', () => {
      expect(RISK_DOT_COLORS.LOW).toBe('#16A34A');
      expect(RISK_DOT_COLORS.MODERATE).toBe('#F59E0B');
      expect(RISK_DOT_COLORS.HIGH).toBe('#DC2626');
      expect(RISK_DOT_COLORS.INSUFFICIENT_DATA).toBe('#94A3B8');

      expect(RISK_CONFIG.LOW_OBSERVED_HAZARD.hex).toBe('#16A34A');
      expect(RISK_CONFIG.LOW_OBSERVED_HAZARD.label).toBe('LOW RISK');

      expect(RISK_CONFIG.MODERATE_HAZARD.hex).toBe('#F59E0B');
      expect(RISK_CONFIG.MODERATE_HAZARD.label).toBe('MODERATE RISK');

      expect(RISK_CONFIG.HIGH_HAZARD.hex).toBe('#DC2626');
      expect(RISK_CONFIG.HIGH_HAZARD.label).toBe('HIGH RISK');

      expect(RISK_CONFIG.INSUFFICIENT_DATA.hex).toBe('#94A3B8');
      expect(RISK_CONFIG.INSUFFICIENT_DATA.label).toBe('INSUFFICIENT DATA');
    });

    it('generates correct popup HTML for a GREEN dot (LOW RISK)', () => {
      const greenFeat = mockViewportFeatures[0]; // LOW_OBSERVED_HAZARD
      const html = createDotPopupHtml(greenFeat);

      expect(html).toContain('LOW RISK');
      expect(html).toContain('#16A34A');
      expect(html).toContain(greenFeat.name);
      expect(html).toContain('10.1118° N, 76.3533° E');
      expect(html).toContain('Ernakulam District');
      expect(html).toContain('Low observed hydrodynamic hazard');
      expect(html).toContain('does NOT mean safe for swimming');
    });

    it('generates correct popup HTML for a YELLOW/AMBER dot (MODERATE RISK)', () => {
      const yellowFeat = mockViewportFeatures[1]; // MODERATE_HAZARD
      const html = createDotPopupHtml(yellowFeat);

      expect(html).toContain('MODERATE RISK');
      expect(html).toContain('#F59E0B');
      expect(html).toContain(yellowFeat.name);
      expect(html).toContain('9.7110° N, 76.6840° E');
      expect(html).toContain('Kottayam District');
      expect(html).toContain('Moderate risk assigned due to major perennial river flow');
    });

    it('generates correct popup HTML for a RED dot (HIGH RISK)', () => {
      const redFeat = mockViewportFeatures[2]; // HIGH_HAZARD
      const html = createDotPopupHtml(redFeat);

      expect(html).toContain('HIGH RISK');
      expect(html).toContain('#DC2626');
      expect(html).toContain(redFeat.name);
      expect(html).toContain('9.5950° N, 76.5650° E');
      expect(html).toContain('Kottayam District');
      expect(html).toContain('High risk assigned due to deep abandoned quarry');
    });

    it('generates correct popup HTML for an INSUFFICIENT DATA dot without assuming safety', () => {
      const greyFeat = mockViewportFeatures[3]; // INSUFFICIENT_DATA
      const html = createDotPopupHtml(greyFeat);

      expect(html).toContain('INSUFFICIENT DATA');
      expect(html).toContain('#94A3B8');
      expect(html).toContain(greyFeat.name);
      expect(html).toContain('10.2050° N, 76.4100° E');
      expect(html).toContain('Ernakulam District');
      expect(html).toContain('Insufficient empirical data');
      expect(html).not.toContain('LOW RISK');
    });
  });

  describe('2. Interactive Marker Clicking & Selection Lifecycle (Task 1 & Task 3)', () => {
    it('creates markers for all viewport waterbodies and binds informative popups', async () => {
      const onSelectStation = vi.fn();

      await act(async () => {
        root!.render(
          <OperationsMap
            waterBodies={[]}
            selectedStation={null}
            onSelectStation={onSelectStation}
          />
        );
      });

      // Wait for viewport load
      await act(async () => {
        await new Promise((r) => setTimeout(r, 50));
      });

      expect(createdMarkers.length).toBe(mockViewportFeatures.length);

      // Verify each marker is bound with a popup
      createdMarkers.forEach((marker) => {
        expect(marker.bindPopup).toHaveBeenCalled();
        const popupContent = marker._getPopupContent();
        expect(popupContent).toContain('aquora-waterbody-popup');
      });
    });

    it('clicking a GREEN marker immediately displays its information and opens popup', async () => {
      const onSelectStation = vi.fn();

      await act(async () => {
        root!.render(
          <OperationsMap
            waterBodies={[]}
            selectedStation={null}
            onSelectStation={onSelectStation}
          />
        );
      });

      await act(async () => {
        await new Promise((r) => setTimeout(r, 50));
      });

      const greenMarker = createdMarkers[0]; // Aluva Periyar Regulated Canal
      expect(greenMarker).toBeDefined();

      await act(async () => {
        greenMarker._trigger('click');
      });

      // Verify marker was highlighted and popup opened
      expect(greenMarker.openPopup).toHaveBeenCalled();
      expect(greenMarker.setStyle).toHaveBeenCalledWith(
        expect.objectContaining({ radius: 12, color: '#082536' })
      );

      // Verify external callback received waterbody
      expect(onSelectStation).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 101,
          name: 'Aluva Periyar Regulated Canal',
          current_risk_level: 'low',
        })
      );

      // Verify detail drawer renders waterbody name and low risk badge
      expect(container?.textContent).toContain('Aluva Periyar Regulated Canal');
      expect(container?.textContent).toContain('LOW RISK');
      expect(container?.textContent).toContain('10.1118°N, 76.3533°E');
    });

    it('clicking a YELLOW marker updates to MODERATE RISK with matching name and coords', async () => {
      const onSelectStation = vi.fn();

      await act(async () => {
        root!.render(
          <OperationsMap
            waterBodies={[]}
            selectedStation={null}
            onSelectStation={onSelectStation}
          />
        );
      });

      await act(async () => {
        await new Promise((r) => setTimeout(r, 50));
      });

      const yellowMarker = createdMarkers[1]; // Pala Station Reach

      await act(async () => {
        yellowMarker._trigger('click');
      });

      expect(yellowMarker.openPopup).toHaveBeenCalled();
      expect(onSelectStation).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 102,
          name: 'Meenachil River (Pala Station Reach)',
          current_risk_level: 'moderate',
        })
      );

      expect(container?.textContent).toContain('Meenachil River (Pala Station Reach)');
      expect(container?.textContent).toContain('MODERATE RISK');
      expect(container?.textContent).toContain('9.7110°N, 76.6840°E');
    });

    it('clicking a RED marker updates to HIGH RISK with matching quarry details', async () => {
      const onSelectStation = vi.fn();

      await act(async () => {
        root!.render(
          <OperationsMap
            waterBodies={[]}
            selectedStation={null}
            onSelectStation={onSelectStation}
          />
        );
      });

      await act(async () => {
        await new Promise((r) => setTimeout(r, 50));
      });

      const redMarker = createdMarkers[2]; // Vadavathoor Quarry

      await act(async () => {
        redMarker._trigger('click');
      });

      expect(redMarker.openPopup).toHaveBeenCalled();
      expect(onSelectStation).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 103,
          name: 'Vadavathoor Abandoned Granite Quarry',
          current_risk_level: 'high',
        })
      );

      expect(container?.textContent).toContain('Vadavathoor Abandoned Granite Quarry');
      expect(container?.textContent).toContain('HIGH RISK');
      expect(container?.textContent).toContain('9.5950°N, 76.5650°E');
    });

    it('selecting multiple markers consecutively cleanly updates without state leakage', async () => {
      const onSelectStation = vi.fn();

      await act(async () => {
        root!.render(
          <OperationsMap
            waterBodies={[]}
            selectedStation={null}
            onSelectStation={onSelectStation}
          />
        );
      });

      await act(async () => {
        await new Promise((r) => setTimeout(r, 50));
      });

      // 1. Click Green
      await act(async () => {
        createdMarkers[0]._trigger('click');
      });
      expect(container?.textContent).toContain('Aluva Periyar Regulated Canal');
      expect(container?.textContent).toContain('LOW RISK');

      // 2. Click Red
      await act(async () => {
        createdMarkers[2]._trigger('click');
      });
      expect(container?.textContent).toContain('Vadavathoor Abandoned Granite Quarry');
      expect(container?.textContent).toContain('HIGH RISK');
      expect(container?.textContent).not.toContain('Aluva Periyar Regulated Canal');

      // 3. Click Yellow
      await act(async () => {
        createdMarkers[1]._trigger('click');
      });
      expect(container?.textContent).toContain('Meenachil River (Pala Station Reach)');
      expect(container?.textContent).toContain('MODERATE RISK');
      expect(container?.textContent).not.toContain('Vadavathoor Abandoned Granite Quarry');
    });

    it('dismissing the detail panel with the close button hides it cleanly', async () => {
      await act(async () => {
        root!.render(
          <OperationsMap
            waterBodies={[]}
            selectedStation={null}
            onSelectStation={vi.fn()}
          />
        );
      });

      await act(async () => {
        await new Promise((r) => setTimeout(r, 50));
      });

      await act(async () => {
        createdMarkers[0]._trigger('click');
      });

      expect(container?.textContent).toContain('Primary Location:');

      // Find close button
      const closeBtn = container?.querySelector('button[title="Close Assessment Drawer"]') as HTMLButtonElement;
      expect(closeBtn).not.toBeNull();

      await act(async () => {
        closeBtn.click();
      });

      expect(container?.textContent).not.toContain('Primary Location:');
    });

    it('prevents cross-dataset integer ID collisions between pilot stations (1-8) and OSM features (1-59)', async () => {
      const collidingPilotStation: WaterBody = {
        id: 101, // same ID as mockViewportFeatures[0]
        name: 'Completely Unrelated Station',
        type: 'reservoir',
        latitude: 8.5241, // in Thiruvananthapuram, far away
        longitude: 76.9366,
        elevation_m: 10,
        current_risk_level: 'extreme',
        current_risk_score: 95,
        is_demonstration_data: false,
        risk_score: 95,
        flow_rate_cms: 0,
        depth_meters: 5,
        water_temp_c: 26.5,
        last_updated: new Date().toISOString(),
      };

      // 1. isStationFeatureMatch must return false for ID collision with mismatched name/coords
      expect(isStationFeatureMatch(collidingPilotStation, mockViewportFeatures[0])).toBe(false);

      const onSelectStation = vi.fn();

      await act(async () => {
        root!.render(
          <OperationsMap
            waterBodies={[collidingPilotStation]}
            selectedStation={null}
            onSelectStation={onSelectStation}
          />
        );
      });

      await act(async () => {
        await new Promise((r) => setTimeout(r, 50));
      });

      // 2. Click the green marker (Aluva Canal, ID 101)
      await act(async () => {
        createdMarkers[0]._trigger('click');
      });

      // 3. Must NOT select "Completely Unrelated Station" even though IDs collide
      expect(onSelectStation).not.toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Completely Unrelated Station' })
      );

      // 4. Must select the actual clicked waterbody
      expect(onSelectStation).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Aluva Periyar Regulated Canal' })
      );
      expect(container?.textContent).toContain('Aluva Periyar Regulated Canal');
      expect(container?.textContent).not.toContain('Completely Unrelated Station');
    });
  });
});

