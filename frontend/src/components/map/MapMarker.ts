import { RiskLevel } from '../../types';

export interface RiskColorConfig {
  hex: string;
  label: string;
  range: string;
}

/** Canonical risk color mapping — single source of truth for all map markers and UI badges. */
export const RISK_COLORS: Record<RiskLevel, RiskColorConfig> = {
  low:      { hex: '#5C9B72', label: 'Safe / Low',           range: '< 40' },
  moderate: { hex: '#C99A45', label: 'Advisory / Moderate', range: '40 – 69' },
  high:     { hex: '#C96A50', label: 'High Risk',           range: '70 – 84' },
  extreme:  { hex: '#B74848', label: 'Critical Risk',       range: '85 – 100' },
};

/** Returns the color config for a given risk level, defaulting to a neutral grey on unknown. */
export function getRiskColor(level: RiskLevel): RiskColorConfig {
  return RISK_COLORS[level] ?? { hex: '#9BA5A5', label: 'Unknown', range: '—' };
}

/**
 * Builds an SVG data URL for a teardrop map pin marker.
 *
 * @param riskLevel  - Risk tier driving pin color
 * @param isSelected - Whether the pin should appear highlighted/enlarged
 * @param showRing   - Whether to draw an animated-style pulse ring
 */
export function createMarkerIcon(
  riskLevel: RiskLevel,
  isSelected: boolean,
  showRing: boolean = true
): { url: string; scaledSize: { width: number; height: number }; anchor: { x: number; y: number } } {
  const { hex } = getRiskColor(riskLevel);
  const baseSize = isSelected ? 40 : 32;
  const pinHeight = Math.round(baseSize * 1.25);
  const stroke = isSelected ? '#E8E5DC' : 'rgba(232,229,220,0.75)';
  const strokeWidth = isSelected ? 3 : 2;

  const ringMarkup = showRing
    ? `<circle cx="16" cy="16" r="11" fill="${hex}" fill-opacity="0.18" stroke="${hex}" stroke-width="1"/>`
    : '';

  const selRingMarkup = isSelected
    ? `<circle cx="16" cy="16" r="14" fill="none" stroke="white" stroke-width="1.5" stroke-opacity="0.5"/>`
    : '';

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${baseSize}" height="${pinHeight}" viewBox="0 0 32 40">
    ${selRingMarkup}
    ${ringMarkup}
    <path d="M16 0C7.163 0 0 7.163 0 16c0 10 16 24 16 24S32 26 32 16C32 7.163 24.837 0 16 0z"
      fill="${hex}" stroke="${stroke}" stroke-width="${strokeWidth}"/>
    <circle cx="16" cy="16" r="6" fill="white" fill-opacity="0.92"/>
  </svg>`;

  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    scaledSize: { width: baseSize, height: pinHeight },
    anchor: { x: baseSize / 2, y: pinHeight },
  };
}
