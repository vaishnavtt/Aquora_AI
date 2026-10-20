import React from 'react';
import { RiskLevel } from '../../types';

const RISK_TIERS: { level: RiskLevel; hex: string; label: string; range: string }[] = [
  { level: 'low',      hex: '#16A34A', label: 'Low Risk',      range: '< 30' },
  { level: 'moderate', hex: '#F59E0B', label: 'Moderate Risk', range: '30 – 60' },
  { level: 'high',     hex: '#F97316', label: 'High Risk',     range: '60 – 80' },
  { level: 'extreme',  hex: '#DC2626', label: 'Critical Risk', range: '> 80' },
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
      className={`px-3 py-2 rounded-xl bg-slate-900/95 border border-slate-700 shadow-lg backdrop-blur-sm ${className}`}
      role="note"
      aria-label="Risk level color legend"
    >
      <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">
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
            <span className="text-[10px] text-slate-200 leading-none">{label}</span>
            <span className="text-[9px] text-slate-500 font-mono ml-auto pl-2">{range}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};
