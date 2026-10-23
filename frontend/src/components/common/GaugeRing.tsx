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
    if (isNaN(val)) return { stroke: '#9BA5A5', text: 'text-[#9BA5A5]', bg: 'bg-[#23292C]' };
    if (val < 40) return { stroke: '#5C9B72', text: 'text-[#5C9B72]', bg: 'bg-[rgba(92,155,114,0.16)]' };
    if (val < 70) return { stroke: '#C99A45', text: 'text-[#C99A45]', bg: 'bg-[rgba(201,154,69,0.16)]' };
    return { stroke: '#C96A50', text: 'text-[#C96A50]', bg: 'bg-[rgba(201,106,80,0.16)]' };
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
          stroke="#384145"
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
          <span className="text-[10px] uppercase font-semibold text-[#9BA5A5] tracking-wider font-mono">
            / {maxScore}
          </span>
        </div>
      )}
    </div>
  );
};
