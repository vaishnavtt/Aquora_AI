import React from 'react';
import { RiskLevel } from '../../types';

const RISK_TIERS: { level: RiskLevel; hex: string; label: string; range: string }[] = [
  { level: 'low',      hex: '#5C9B72', label: 'Safe / Low',           range: '< 40' },
  { level: 'moderate', hex: '#C99A45', label: 'Advisory / Moderate', range: '40 – 69' },
  { level: 'high',     hex: '#C96A50', label: 'High Risk',           range: '70 – 84' },
  { level: 'extreme',  hex: '#B74848', label: 'Critical Risk',       range: '85 – 100' },
];

interface RiskLegendProps {
  className?: string;
}

/**
 * Compact map legend explaining risk tier colors.
 * Designed to sit in the bottom-right corner of the map viewport.
 */
export const RiskLegend: React.FC<RiskLegendProps> = ({ className = '' }) => {
  return (
    <div
      className={`px-3 py-2 rounded-xl bg-[#1A1F22]/95 border border-[#384145] shadow-lg backdrop-blur-sm ${className}`}
      role="note"
      aria-label="Risk level color legend"
    >
      <p className="text-[9px] font-bold uppercase tracking-widest text-[#9BA5A5] mb-1.5 font-mono">
        Risk Legend
      </p>
      <ul className="space-y-1">
        {RISK_TIERS.map(({ level, hex, label, range }) => (
          <li key={level} className="flex items-center gap-2">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
              style={{ backgroundColor: hex }}
              aria-hidden="true"
            />
            <span className="text-[10px] text-[#E8E5DC] leading-none font-mono">{label}</span>
            <span className="text-[9px] text-[#9BA5A5] font-mono ml-auto pl-2">{range}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};
