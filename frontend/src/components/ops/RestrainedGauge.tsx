import React from 'react';
import { ShieldCheck, AlertTriangle, AlertOctagon, Flame } from 'lucide-react';
import { RiskLevel } from '../../types';
import { RISK_TOKENS } from './RiskBadge';

interface RestrainedGaugeProps {
  score: number | null | undefined;
  level?: RiskLevel | null;
  confidence?: number | null;
  size?: number;
  strokeWidth?: number;
}

export const RestrainedGauge: React.FC<RestrainedGaugeProps> = ({
  score,
  level = 'low',
  confidence = null,
  size = 140,
  strokeWidth = 9,
}) => {
  const hasScore = score != null && !isNaN(score);
  const normalizedScore = hasScore ? Math.min(Math.max(score, 0), 100) : 0;
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  // Semi-circle arc (or 240-degree operational sweep)
  const arcSweep = 240;
  const arcCircumference = (arcSweep / 360) * circumference;
  const strokeDashoffset = hasScore
    ? arcCircumference - (normalizedScore / 100) * arcCircumference
    : arcCircumference;

  const currentLevel = level || 'low';
  const token = RISK_TOKENS[currentLevel] || RISK_TOKENS.low;
  const Icon = token.Icon;

  return (
    <div className="flex flex-col items-center justify-center p-3">
      <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size * 0.85 }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="transform -rotate-[210deg] overflow-visible"
        >
          {/* Background Track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#384145"
            strokeWidth={strokeWidth}
            strokeDasharray={`${arcCircumference} ${circumference}`}
            strokeLinecap="round"
            fill="transparent"
          />
          {/* Active Level Arc */}
          {hasScore && (
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={token.hex}
              strokeWidth={strokeWidth}
              strokeDasharray={`${arcCircumference} ${circumference}`}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="transparent"
              className="transition-all duration-500 ease-out"
            />
          )}
        </svg>

        {/* Center Technical Readout */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pt-2">
          <div className="text-[10px] font-mono uppercase text-[#9BA5A5] tracking-wider">
            Risk Score
          </div>
          <div className="flex items-baseline space-x-1">
            {hasScore ? (
              <>
                <span className="font-mono text-3xl font-semibold text-[#E8E5DC]">
                  {Math.round(normalizedScore)}
                </span>
                <span className="font-mono text-xs text-[#9BA5A5]">/ 100</span>
              </>
            ) : (
              <>
                <span className="font-mono text-3xl font-semibold text-[#9BA5A5]">—</span>
                <span className="font-mono text-xs text-[#9BA5A5]">Unrated</span>
              </>
            )}
          </div>
          <div
            className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold uppercase mt-0.5"
            style={{
              backgroundColor: hasScore ? token.bgHex : '#23292C',
              color: hasScore ? token.textHex : '#9BA5A5',
              borderColor: hasScore ? token.borderHex : '#384145',
              borderWidth: '1px',
            }}
          >
            {hasScore && <Icon className="w-2.5 h-2.5 shrink-0" style={{ color: token.hex }} />}
            <span>{hasScore ? currentLevel.toUpperCase() : 'UNRATED'}</span>
          </div>
        </div>
      </div>

      {/* Model Confidence Sub-label */}
      <div className="mt-2 text-center border-t border-[#384145] pt-1.5 w-full">
        <span className="text-[10px] text-[#9BA5A5] font-sans">Model confidence: </span>
        <span className="font-mono text-[11px] font-medium text-[#E8E5DC]">
          {confidence != null && !isNaN(confidence) ? `${confidence.toFixed(1)}%` : 'Unavailable'}
        </span>
      </div>
    </div>
  );
};
