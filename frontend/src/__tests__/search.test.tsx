// @vitest-environment happy-dom
import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { WaterBodySearchBar } from '../components/common/WaterBodySearchBar';
import { DEMO_WATER_BODIES } from '../services/api';

// @ts-ignore
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe('WaterBodySearchBar Unit Tests', () => {
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

  const setInputValue = (input: HTMLInputElement, value: string) => {
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      'value'
    )?.set;
    nativeInputValueSetter?.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  };

  it('renders search input with placeholder', () => {
    act(() => {
      root!.render(
        <WaterBodySearchBar
          waterBodies={DEMO_WATER_BODIES}
          placeholder="Search water body..."
        />
      );
    });

    const input = container?.querySelector('input');
    expect(input).not.toBeNull();
    expect(input?.getAttribute('placeholder')).toBe('Search water body...');
  });

  it('shows matching suggestions when typing "ram"', () => {
    act(() => {
      root!.render(
        <WaterBodySearchBar
          waterBodies={DEMO_WATER_BODIES}
          placeholder="Search water body..."
        />
      );
    });

    const input = container?.querySelector('input')!;
    act(() => {
      input.focus();
      setInputValue(input, 'ram');
    });

    // Should display Ramamangalam Bridge from DEMO_WATER_BODIES
    expect(container?.textContent).toContain('Ramamangalam Bridge');
  });

  it('shows "No matching water bodies found" when no items match', () => {
    act(() => {
      root!.render(
        <WaterBodySearchBar
          waterBodies={DEMO_WATER_BODIES}
          placeholder="Search water body..."
        />
      );
    });

    const input = container?.querySelector('input')!;
    act(() => {
      input.focus();
      setInputValue(input, 'xyznonexistent123');
    });

    expect(container?.textContent).toContain('No matching water bodies found');
  });

  it('calls onSelectWaterBody when a suggestion is clicked', () => {
    const handleSelect = vi.fn();
    act(() => {
      root!.render(
        <WaterBodySearchBar
          waterBodies={DEMO_WATER_BODIES}
          onSelectWaterBody={handleSelect}
        />
      );
    });

    const input = container?.querySelector('input')!;
    act(() => {
      input.focus();
      setInputValue(input, 'ram');
    });

    const suggestionItem = container?.querySelector('[role="option"]') as HTMLElement;
    expect(suggestionItem).not.toBeNull();
    act(() => {
      suggestionItem.click();
    });

    expect(handleSelect).toHaveBeenCalledTimes(1);
    expect(handleSelect.mock.calls[0][0].name).toContain('Ramamangalam');
  });

  it('handles Escape key to dismiss suggestions', () => {
    act(() => {
      root!.render(
        <WaterBodySearchBar
          waterBodies={DEMO_WATER_BODIES}
        />
      );
    });

    const input = container?.querySelector('input')!;
    act(() => {
      input.focus();
      setInputValue(input, 'ram');
    });

    expect(container?.textContent).toContain('Ramamangalam Bridge');

    act(() => {
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });

    // Dropdown list should be closed
    expect(container?.querySelector('[role="listbox"]')).toBeNull();
  });

  it('clears query when clicking the clear button', () => {
    act(() => {
      root!.render(
        <WaterBodySearchBar
          waterBodies={DEMO_WATER_BODIES}
        />
      );
    });

    const input = container?.querySelector('input')!;
    act(() => {
      input.focus();
      setInputValue(input, 'river');
    });

    expect(input.value).toBe('river');

    const clearButton = container?.querySelector('button[aria-label="Clear search query"]') as HTMLButtonElement;
    expect(clearButton).not.toBeNull();

    act(() => {
      clearButton.click();
    });

    expect(input.value).toBe('');
  });
});
