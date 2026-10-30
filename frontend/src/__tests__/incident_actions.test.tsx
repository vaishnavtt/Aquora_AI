// @vitest-environment happy-dom
import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { IncidentActionsConsole } from '../components/ops/IncidentActionsConsole';
import { DEMO_WATER_BODIES } from '../services/api';

// @ts-ignore
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe('IncidentActionsConsole & Inspection Governance Suite', () => {
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

  it('renders Incident Actions Console with Alert and Inspection sub-tabs', async () => {
    await act(async () => {
      root!.render(
        <IncidentActionsConsole
          waterBodies={DEMO_WATER_BODIES}
          selectedStation={DEMO_WATER_BODIES[0]}
        />
      );
    });

    expect(container?.textContent).toContain('Incident Actions & Governance Console');
    expect(container?.textContent).toContain('Alert Dispatches');
    expect(container?.textContent).toContain('Site Inspections');
  });

  it('switches to Site Inspections tab and displays ledger controls', async () => {
    await act(async () => {
      root!.render(
        <IncidentActionsConsole
          waterBodies={DEMO_WATER_BODIES}
          selectedStation={DEMO_WATER_BODIES[0]}
        />
      );
    });

    const buttons = Array.from(container?.querySelectorAll('button') || []);
    const inspectionsTabBtn = buttons.find((b) => b.textContent?.includes('Site Inspections'));
    expect(inspectionsTabBtn).toBeDefined();

    await act(async () => {
      inspectionsTabBtn?.click();
    });

    expect(container?.textContent).toContain('Official Municipal Site Inspections Ledger');
    expect(container?.textContent).toContain('Schedule Site Audit');
    expect(container?.textContent).toContain('Status:');
  });

  it('opens Schedule Site Audit form with priority and inspector controls', async () => {
    await act(async () => {
      root!.render(
        <IncidentActionsConsole
          waterBodies={DEMO_WATER_BODIES}
          selectedStation={DEMO_WATER_BODIES[0]}
        />
      );
    });

    const buttons = Array.from(container?.querySelectorAll('button') || []);
    const inspectionsTabBtn = buttons.find((b) => b.textContent?.includes('Site Inspections'));

    await act(async () => {
      inspectionsTabBtn?.click();
    });

    const scheduleBtn = Array.from(container?.querySelectorAll('button') || []).find((b) =>
      b.textContent?.includes('Schedule Site Audit')
    );
    expect(scheduleBtn).toBeDefined();

    await act(async () => {
      scheduleBtn?.click();
    });

    expect(container?.textContent).toContain('Schedule New Municipal Safety Audit');
    expect(container?.textContent).toContain('Monitored Water Body');
    expect(container?.textContent).toContain('Priority Tier');
    expect(container?.textContent).toContain('Inspector Name / Unit');
  });
});
