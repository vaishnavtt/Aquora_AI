import React from 'react';

interface GaugeRingProps {
  score: number;
  maxScore?: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
  showText?: boolean;
}

export const GaugeRing: React.FC<GaugeRingProps> = ({
  score,
  maxScore = 100,
  size = 120,
  strokeWidth = 10,
  className = '',
  showText = true,
}) => {
  const normalizedScore = Math.min(Math.max(score, 0), maxScore);
  const percentage = (normalizedScore / maxScore) * 100;

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const getColor = (val: number): { stroke: string; text: string; bg: string } => {
    if (isNaN(val)) return { stroke: '#94A3B8', text: 'text-slate-500', bg: 'bg-slate-100' };
    if (val < 40) return { stroke: '#16A34A', text: 'text-emerald-700', bg: 'bg-emerald-50' };
    if (val < 70) return { stroke: '#F59E0B', text: 'text-amber-700', bg: 'bg-amber-50' };
    return { stroke: '#DC2626', text: 'text-rose-700', bg: 'bg-rose-50' };
  };

  const colors = getColor(normalizedScore);

  return (
    <div
      className={`relative inline-flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
      role="progressbar"
      aria-valuenow={normalizedScore}
      aria-valuemin={0}
      aria-valuemax={maxScore}
      aria-label={`Risk score: ${normalizedScore} out of ${maxScore}`}
    >
      <svg
        width={size}
        height={size}
        className="transform -rotate-90"
        viewBox={`0 0 ${size} ${size}`}
      >
        {/* Background Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#E2E8F0"
          strokeWidth={strokeWidth}
          fill="transparent"
          className="transition-colors"
        />
        {/* Progress Value */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={colors.stroke}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="transparent"
          className="transition-all duration-700 ease-out"
        />
      </svg>

      {showText && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className={`text-2xl font-bold tracking-tight font-mono ${colors.text}`}>
            {Math.round(normalizedScore)}
          </span>
          <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
            / {maxScore}
          </span>
        </div>
      )}
    </div>
  );
};
