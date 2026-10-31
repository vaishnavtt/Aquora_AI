// @vitest-environment happy-dom
import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CWCLiveTelemetrySection } from '../components/ops/CWCLiveTelemetrySection';

// Configure React act environment for happy-dom
// @ts-ignore
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const mockCWCData = {
  timestamp: '2026-10-31T01:00:00Z',
  provider: 'Central Water Commission (CWC) - Ministry of Jal Shakti',
  provider_status: 'CONNECTED',
  api_endpoint: 'https://ffs.india-water.gov.in/iam/api/new-entry-data/specification/sorted-page',
  total_stations: 8,
  live_stations_count: 8,
  notice: 'Monitoring 8 official CWC stations across Kerala river basins.',
  disclaimer: 'Authentic river stage observations ingested directly from CWC Flood Forecasting System.',
  stations: [
    {
      station_code: '012-SWRDKOCHI',
      station_name: 'Neeleeswaram',
      river: 'Periyar',
      district: 'Ernakulam',
      latitude: 10.1836,
      longitude: 76.4956,
      current_water_level_m: 0.54,
      observation_time_iso: '2026-10-30T15:30:00Z',
      observation_time_ist: '30-Oct-2026 21:00 IST',
      retrieval_timestamp: '2026-10-31T01:00:00Z',
      data_source: 'Central Water Commission (CWC) Flood Forecast System via Ministry of Jal Shakti',
      data_freshness: 'RECENT',
      status: 'RECENT',
      is_live: false,
      is_cached: false,
      unit: 'm',
      warning_threshold_m: 9.00,
      danger_threshold_m: 10.00,
      highest_flood_level_m: 12.40,
      highest_flood_date: '2018-08-19',
      level_status: 'NORMAL',
      notice: 'CWC physical telemetry observation (Neeleeswaram).'
    },
    {
      station_code: '011-SWRDKOCHI',
      station_name: 'Arangali',
      river: 'Chalakkudy',
      district: 'Thrissur',
      latitude: 10.2861,
      longitude: 76.3222,
      current_water_level_m: 1.16,
      observation_time_iso: '2026-10-30T17:30:00Z',
      observation_time_ist: '30-Oct-2026 23:00 IST',
      retrieval_timestamp: '2026-10-31T01:00:00Z',
      data_source: 'Central Water Commission (CWC) Flood Forecast System via Ministry of Jal Shakti',
      data_freshness: 'LIVE',
      status: 'LIVE',
      is_live: true,
      is_cached: false,
      unit: 'm',
      warning_threshold_m: 7.10,
      danger_threshold_m: 8.10,
      highest_flood_level_m: 10.58,
      highest_flood_date: '2018-08-16',
      level_status: 'NORMAL',
      notice: 'Live telemetry observation from CWC Arangali station.'
    },
    {
      station_code: '010-SWRDKOCHI',
      station_name: 'Mankara',
      river: 'Bharathappuzha',
      district: 'Palakkad',
      latitude: 10.7611,
      longitude: 76.4861,
      current_water_level_m: 47.41,
      observation_time_iso: '2026-10-30T17:30:00Z',
      observation_time_ist: '30-Oct-2026 23:00 IST',
      retrieval_timestamp: '2026-10-31T01:00:00Z',
      data_source: 'Central Water Commission (CWC) Flood Forecast System via Ministry of Jal Shakti',
      data_freshness: 'LIVE',
      status: 'LIVE',
      is_live: true,
      is_cached: false,
      unit: 'm',
      warning_threshold_m: 51.53,
      danger_threshold_m: 52.53,
      highest_flood_level_m: 52.53,
      highest_flood_date: '2018-08-16',
      level_status: 'NORMAL',
      notice: 'Live telemetry observation from CWC Mankara station.'
    },
    {
      station_code: 'CW1VAR000466',
      station_name: 'Kuttippuram',
      river: 'Bharathappuzha',
      district: 'Malappuram',
      latitude: 10.8408,
      longitude: 76.0222,
      current_water_level_m: 3.13,
      observation_time_iso: '2026-10-30T17:30:00Z',
      observation_time_ist: '30-Oct-2026 23:00 IST',
      retrieval_timestamp: '2026-10-31T01:00:00Z',
      data_source: 'Central Water Commission (CWC) Flood Forecast System via Ministry of Jal Shakti',
      data_freshness: 'LIVE',
      status: 'LIVE',
      is_live: true,
      is_cached: false,
      unit: 'm',
      warning_threshold_m: 7.50,
      danger_threshold_m: 8.50,
      highest_flood_level_m: 6.98,
      highest_flood_date: '2025-06-26',
      level_status: 'NORMAL',
      notice: 'Live telemetry observation from CWC Kuttippuram station.'
    },
    {
      station_code: '007-SWRDKOCHI',
      station_name: 'Pulamanthole',
      river: 'Kunthipuzha',
      district: 'Malappuram',
      latitude: 10.8981,
      longitude: 76.1919,
      current_water_level_m: 12.11,
      observation_time_iso: '2026-10-30T17:30:00Z',
      observation_time_ist: '30-Oct-2026 23:00 IST',
      retrieval_timestamp: '2026-10-31T01:00:00Z',
      data_source: 'Central Water Commission (CWC) Flood Forecast System via Ministry of Jal Shakti',
      data_freshness: 'LIVE',
      status: 'LIVE',
      is_live: true,
      is_cached: false,
      unit: 'm',
      warning_threshold_m: 15.60,
      danger_threshold_m: 16.60,
      highest_flood_level_m: 20.25,
      highest_flood_date: '2019-08-09',
      level_status: 'NORMAL',
      notice: 'Live telemetry observation from CWC Pulamanthole station.'
    },
    {
      station_code: '005-SWRDKOCHI',
      station_name: 'Kuniyil',
      river: 'Chaliyar',
      district: 'Malappuram / Kozhikode',
      latitude: 11.2394,
      longitude: 76.0233,
      current_water_level_m: 2.41,
      observation_time_iso: '2026-10-30T17:30:00Z',
      observation_time_ist: '30-Oct-2026 23:00 IST',
      retrieval_timestamp: '2026-10-31T01:00:00Z',
      data_source: 'Central Water Commission (CWC) Flood Forecast System via Ministry of Jal Shakti',
      data_freshness: 'LIVE',
      status: 'LIVE',
      is_live: true,
      is_cached: false,
      unit: 'm',
      warning_threshold_m: 10.85,
      danger_threshold_m: 11.85,
      highest_flood_level_m: 12.14,
      highest_flood_date: '2019-08-09',
      level_status: 'NORMAL',
      notice: 'Live telemetry observation from CWC Kuniyil station.'
    },
    {
      station_code: '004-SWRDKOCHI',
      station_name: 'Kuttyadi',
      river: 'Kuttiyadi',
      district: 'Kozhikode',
      latitude: 11.6508,
      longitude: 75.7583,
      current_water_level_m: 0.91,
      observation_time_iso: '2026-10-30T17:30:00Z',
      observation_time_ist: '30-Oct-2026 23:00 IST',
      retrieval_timestamp: '2026-10-31T01:00:00Z',
      data_source: 'Central Water Commission (CWC) Flood Forecast System via Ministry of Jal Shakti',
      data_freshness: 'LIVE',
      status: 'LIVE',
      is_live: true,
      is_cached: false,
      unit: 'm',
      warning_threshold_m: 5.95,
      danger_threshold_m: 6.95,
      highest_flood_level_m: 8.70,
      highest_flood_date: '2019-08-08',
      level_status: 'NORMAL',
      notice: 'Live telemetry observation from CWC Kuttyadi station.'
    },
    {
      station_code: '002-SWRDKOCHI',
      station_name: 'Perumannu',
      river: 'Valapattanam',
      district: 'Kannur',
      latitude: 11.9823,
      longitude: 75.5842,
      current_water_level_m: 7.43,
      observation_time_iso: '2026-10-30T14:30:00Z',
      observation_time_ist: '30-Oct-2026 20:00 IST',
      retrieval_timestamp: '2026-10-31T01:00:00Z',
      data_source: 'Central Water Commission (CWC) Flood Forecast System via Ministry of Jal Shakti',
      data_freshness: 'RECENT',
      status: 'RECENT',
      is_live: false,
      is_cached: false,
      unit: 'm',
      warning_threshold_m: 17.20,
      danger_threshold_m: 18.20,
      highest_flood_level_m: 18.28,
      highest_flood_date: '2019-08-09',
      level_status: 'NORMAL',
      notice: 'CWC physical telemetry observation from Perumannu station.'
    }
  ]
};

vi.mock('../services/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/api')>();
  return {
    ...actual,
    fetchCWCLiveTelemetry: vi.fn().mockImplementation(() => Promise.resolve(mockCWCData)),
  };
});

describe('CWC Live Telemetry Component Suite', () => {
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
  });

  it('renders CWC header, provider status indicator, and station cards', async () => {
    await act(async () => {
      root!.render(<CWCLiveTelemetrySection />);
    });

    // Wait a tick for resolved promise
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
    });

    // Header & Provider indicator
    expect(container?.textContent).toContain('Central Water Commission (CWC) Live River Telemetry');
    expect(container?.textContent).toContain('CWC Connected (Live Feed)');
    expect(container?.textContent).toContain('Ministry of Jal Shakti');

    // Verified Kerala stations
    expect(container?.textContent).toContain('Neeleeswaram');
    expect(container?.textContent).toContain('Periyar River');
    expect(container?.textContent).toContain('Arangali');
    expect(container?.textContent).toContain('Chalakkudy River');
    expect(container?.textContent).toContain('Mankara');
    expect(container?.textContent).toContain('Bharathappuzha River');
    expect(container?.textContent).toContain('Kuttippuram');
    expect(container?.textContent).toContain('Pulamanthole');
    expect(container?.textContent).toContain('Kuniyil');
    expect(container?.textContent).toContain('Kuttyadi');
    expect(container?.textContent).toContain('Perumannu');

    // Values & Units
    expect(container?.textContent).toContain('1.16');
    expect(container?.textContent).toContain('metres');

    // Thresholds & Observation Time
    expect(container?.textContent).toContain('Warn:');
    expect(container?.textContent).toContain('Danger:');
    expect(container?.textContent).toContain('Observation (IST):');

    // Guardrail disclaimer
    expect(container?.textContent).toContain('Scientific Guardrail');
    expect(container?.textContent).toContain('decoupled from the Ramamangalam Machine Learning model');
  });

  it('renders sync button and triggers refresh', async () => {
    await act(async () => {
      root!.render(<CWCLiveTelemetrySection />);
    });

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
    });

    const syncBtn = container?.querySelector('button');
    expect(syncBtn).not.toBeNull();
    expect(syncBtn?.textContent).toContain('Sync CWC Feed');

    // Click refresh button
    await act(async () => {
      syncBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(container?.textContent).toContain('Central Water Commission');
  });
});
