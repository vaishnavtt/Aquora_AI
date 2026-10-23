import React from 'react';
import { RiskLevel } from '../../types';
import { RISK_TOKENS } from './RiskBadge';

interface RestrainedGaugeProps {
  score: number;
  level: RiskLevel;
  confidence?: number;
  size?: number;
  strokeWidth?: number;
}

export const RestrainedGauge: React.FC<RestrainedGaugeProps> = ({
  score,
  level,
  confidence = 94.2,
  size = 200,
  strokeWidth = 14,
}) => {
  const normalizedScore = Math.min(Math.max(score, 0), 100);
  const token = RISK_TOKENS[level] || RISK_TOKENS.low;

  // 180° arc parameters
  const cx = size / 2;
  const strokePadding = strokeWidth + 4;
  const radius = (size - strokePadding * 2) / 2;
  const cy = radius + strokePadding;
  const svgHeight = cy + Math.ceil(strokeWidth / 2) + 6;

  // Helper: point on circle (0° = top, clockwise)
  const polarToCartesian = (angleDeg: number) => {
    const rad = ((angleDeg - 90) * Math.PI) / 180;
    return {
      x: cx + radius * Math.cos(rad),
      y: cy + radius * Math.sin(rad),
    };
  };

  const arcPath = (startAngle: number, endAngle: number) => {
    const start = polarToCartesian(startAngle);
    const end = polarToCartesian(endAngle);
    const largeArc = endAngle - startAngle > 180 ? 1 : 0;
    return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} 1 ${end.x} ${end.y}`;
  };

  const gaugeStart = -90;
  const totalArc = 180;

  // Bright risk colors for gauge bands
  const bands = [
    { from: 0, to: 25, color: '#3FCF8E' },
    { from: 25, to: 50, color: '#F2C14E' },
    { from: 50, to: 75, color: '#FF8A3D' },
    { from: 75, to: 100, color: '#FF5A5F' },
  ];

  const scoreToAngle = (pct: number) => gaugeStart + (pct / 100) * totalArc;
  const needleAngle = scoreToAngle(normalizedScore);

  const needleLength = radius - 8;
  const needleRad = ((needleAngle - 90) * Math.PI) / 180;
  const needleTip = {
    x: cx + needleLength * Math.cos(needleRad),
    y: cy + needleLength * Math.sin(needleRad),
  };

  // Color for score matching bright bands
  const bandColor =
    normalizedScore > 75
      ? '#FF5A5F'
      : normalizedScore > 50
      ? '#FF8A3D'
      : normalizedScore > 25
      ? '#F2C14E'
      : '#3FCF8E';

  const trendDelta = normalizedScore > 75 ? '+4.2' : normalizedScore > 50 ? '+1.8' : '-0.5';
  const isPositive = trendDelta.startsWith('+');
  const trendColor = normalizedScore > 50 ? '#FF5A5F' : '#3FCF8E';
  const formattedDelta = isPositive ? `↑ ${trendDelta.slice(1)}` : `↓ ${trendDelta.slice(1)}`;

  return (
    <div className="flex flex-col items-center w-full max-w-[260px] text-[#F5EEDD]">
      {/* SVG 180° Arc & Needle */}
      <div className="flex justify-center w-full">
        <svg
          width={size}
          height={svgHeight}
          viewBox={`0 0 ${size} ${svgHeight}`}
          className="overflow-visible"
        >
          {/* Background track */}
          <path
            d={arcPath(-90, 90)}
            fill="none"
            stroke="#0A3047"
            strokeWidth={strokeWidth}
            strokeLinecap="butt"
          />

          {/* Colored risk bands in bright risk colors */}
          {bands.map((band) => (
            <path
              key={band.from}
              d={arcPath(scoreToAngle(band.from), scoreToAngle(band.to))}
              fill="none"
              stroke={band.color}
              strokeWidth={strokeWidth}
              strokeLinecap="butt"
              opacity={0.92}
            />
          ))}

          {/* Precision instrument needle */}
          <line
            x1={cx}
            y1={cy}
            x2={needleTip.x}
            y2={needleTip.y}
            stroke="#F5EEDD"
            strokeWidth={2.5}
            strokeLinecap="round"
          />

          {/* Pivot center hub */}
          <circle cx={cx} cy={cy} r={6} fill="#0E3F5C" stroke="#F5EEDD" strokeWidth={2} />
          <circle cx={cx} cy={cy} r={2} fill={bandColor} />
        </svg>
      </div>

      {/* Numerical score readout placed cleanly below the dial */}
      <div className="mt-3 flex flex-col items-center">
        <div className="flex items-baseline justify-center gap-1.5 leading-none">
          <span
            className="font-mono font-semibold text-[44px] tracking-tight leading-none"
            style={{ color: bandColor }}
          >
            {Math.round(normalizedScore)}
          </span>
          <span className="font-mono text-[18px] text-[#D6E3EA] font-normal leading-none">
            /100
          </span>
        </div>

        {/* Risk state & trend delta */}
        <div className="mt-2 flex items-center gap-2">
          <span className="font-sans font-medium text-[13px]" style={{ color: bandColor }}>
            {token.label === 'Extreme' ? 'Extreme · act now' : token.label}
          </span>
          <span className="font-mono text-[12px] font-medium" style={{ color: trendColor }}>
            {formattedDelta}
          </span>
        </div>
      </div>

      {/* Model confidence footer with divider hairline */}
      <div className="mt-3 text-center border-t border-[#6A9AB6]/30 pt-2 w-full">
        <span className="text-[11px] text-[#D6E3EA] font-sans">Model confidence: </span>
        <span className="font-mono text-[12px] font-medium text-[#F5EEDD]">
          {confidence.toFixed(1)}%
        </span>
      </div>
    </div>
  );
};
