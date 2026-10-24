import React from 'react';
import { getRiskToken } from './RiskBadge';
import { RiskLevel } from '../../types';

interface RestrainedGaugeProps {
  score: number | null | undefined;
  level: RiskLevel | string | null | undefined;
  confidence: number | null | undefined;
  size?: number;
}

export const RestrainedGauge: React.FC<RestrainedGaugeProps> = ({
  score,
  level,
  confidence,
  size = 200,
}) => {
  const hasScore = score != null && !isNaN(score);
  const normalizedScore = hasScore ? Math.max(0, Math.min(100, score)) : 0;
  const token = getRiskToken(level);

  // 180-degree half-circle gauge dimensions
  const strokeWidth = 14;
  const radius = (size - strokeWidth) / 2;
  const cx = size / 2;
  const cy = size / 2 + 10;
  const svgHeight = size / 2 + 25;

  const polarToCartesian = (centerX: number, centerY: number, rad: number, angleInDegrees: number) => {
    const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
    return {
      x: centerX + rad * Math.cos(angleInRadians),
      y: centerY + rad * Math.sin(angleInRadians),
    };
  };

  const arcPath = (startAngle: number, endAngle: number) => {
    const start = polarToCartesian(cx, cy, radius, endAngle);
    const end = polarToCartesian(cx, cy, radius, startAngle);
    const largeArc = endAngle - startAngle <= 180 ? '0' : '1';
    return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} 1 ${end.x} ${end.y}`;
  };

  const gaugeStart = -90;
  const totalArc = 180;

  // Modern semantic risk colors for gauge bands
  const bands = [
    { from: 0, to: 25, color: '#16A34A' },
    { from: 25, to: 50, color: '#EAB308' },
    { from: 50, to: 75, color: '#EA580C' },
    { from: 75, to: 100, color: '#DC2626' },
  ];

  const scoreToAngle = (pct: number) => gaugeStart + (pct / 100) * totalArc;
  const needleAngle = hasScore ? scoreToAngle(normalizedScore) : -90;

  const needleLength = radius - 6;
  const needleRad = ((needleAngle - 90) * Math.PI) / 180;
  const needleTip = {
    x: cx + needleLength * Math.cos(needleRad),
    y: cy + needleLength * Math.sin(needleRad),
  };

  // Color for score matching bright bands
  const bandColor = !hasScore
    ? '#94A3B8'
    : normalizedScore > 75
    ? '#DC2626'
    : normalizedScore > 50
    ? '#EA580C'
    : normalizedScore > 25
    ? '#D97706'
    : '#16A34A';

  const trendDelta = normalizedScore > 75 ? '+4.2' : normalizedScore > 50 ? '+1.8' : '-0.5';
  const isPositive = trendDelta.startsWith('+');
  const trendColor = normalizedScore > 50 ? '#DC2626' : '#16A34A';
  const formattedDelta = isPositive ? `↑ ${trendDelta.slice(1)}` : `↓ ${trendDelta.slice(1)}`;

  return (
    <div className="flex flex-col items-center w-full max-w-[260px] text-[#172B4D]">
      {/* SVG 180° Arc & Needle */}
      <div className="flex justify-center w-full">
        <svg
          width={size}
          height={svgHeight}
          viewBox={`0 0 ${size} ${svgHeight}`}
          className="overflow-visible"
        >
          {/* Light Background track */}
          <path
            d={arcPath(-90, 90)}
            fill="none"
            stroke="#E2E8F0"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />

          {/* Colored risk bands with rounded endpoints */}
          {bands.map((band) => (
            <path
              key={band.from}
              d={arcPath(scoreToAngle(band.from), scoreToAngle(band.to))}
              fill="none"
              stroke={band.color}
              strokeWidth={strokeWidth}
              strokeLinecap="butt"
              opacity={hasScore ? 0.95 : 0.3}
            />
          ))}

          {/* Precision instrument needle (visible when scored) */}
          {hasScore && (
            <line
              x1={cx}
              y1={cy}
              x2={needleTip.x}
              y2={needleTip.y}
              stroke="#172B4D"
              strokeWidth={2.5}
              strokeLinecap="round"
            />
          )}

          {/* Pivot center hub */}
          <circle cx={cx} cy={cy} r={6} fill="#172B4D" stroke="#FFFFFF" strokeWidth={2} />
          <circle cx={cx} cy={cy} r={2.5} fill={bandColor} />
        </svg>
      </div>

      {/* Numerical score readout placed cleanly below the dial */}
      <div className="mt-2 flex flex-col items-center">
        <div className="flex items-baseline justify-center gap-1.5 leading-none">
          {hasScore ? (
            <>
              <span
                className="font-mono font-bold text-4xl tracking-tight leading-none"
                style={{ color: bandColor }}
              >
                {Math.round(normalizedScore)}
              </span>
              <span className="font-mono text-base text-slate-400 font-medium leading-none">
                /100
              </span>
            </>
          ) : (
            <>
              <span className="font-mono font-bold text-4xl tracking-tight leading-none text-slate-400">
                —
              </span>
              <span className="font-mono text-base text-slate-400 font-medium leading-none">
                Unrated
              </span>
            </>
          )}
        </div>

        {/* Risk state & trend delta */}
        <div className="mt-2.5 flex items-center gap-2">
          <span
            className="font-sans font-bold text-xs uppercase tracking-wide px-3 py-1 rounded-full border shadow-2xs"
            style={{
              color: hasScore ? bandColor : '#64748B',
              backgroundColor: hasScore
                ? normalizedScore > 75
                  ? '#FEF2F2'
                  : normalizedScore > 50
                  ? '#FFF7ED'
                  : normalizedScore > 25
                  ? '#FFFBEB'
                  : '#F0FDF4'
                : '#F1F5F9',
              borderColor: hasScore
                ? normalizedScore > 75
                  ? '#FECACA'
                  : normalizedScore > 50
                  ? '#FED7AA'
                  : normalizedScore > 25
                  ? '#FDE68A'
                  : '#BBF7D0'
                : '#E2E8F0',
            }}
          >
            {hasScore
              ? token.label === 'Extreme'
                ? 'EXTREME · ACT NOW'
                : token.label.toUpperCase()
              : 'UNRATED'}
          </span>
          {hasScore && (
            <span className="font-mono text-xs font-bold" style={{ color: trendColor }}>
              {formattedDelta}
            </span>
          )}
        </div>
      </div>

      {/* Model confidence footer with divider hairline */}
      <div className="mt-3 text-center border-t border-slate-100 pt-2 w-full">
        <span className="text-xs text-slate-500 font-normal">Model confidence: </span>
        <span className="font-mono text-xs font-bold text-[#172B4D]">
          {confidence != null && !isNaN(confidence) ? `${confidence.toFixed(1)}%` : 'Unavailable'}
        </span>
      </div>
    </div>
  );
};
