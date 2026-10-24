import React from 'react';
import { CheckCircle2, CircleDot, Triangle, Octagon } from 'lucide-react';
import { RiskLevel } from '../../types';

export const RISK_TOKENS: Record<
  RiskLevel,
  {
    label: string;
    hex: string;
    bgHex: string;
    borderHex: string;
    textHex: string;
    surfaceColor: string;
    Icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  }
> = {
  low: {
    label: 'Low',
    hex: '#16A34A',
    bgHex: '#0B2C40',
    borderHex: 'transparent',
    textHex: '#16A34A',
    surfaceColor: '#16A34A',
    Icon: CheckCircle2,
  },
  moderate: {
    label: 'Moderate',
    hex: '#F59E0B',
    bgHex: '#0B2C40',
    borderHex: 'transparent',
    textHex: '#F59E0B',
    surfaceColor: '#F59E0B',
    Icon: CircleDot,
  },
  high: {
    label: 'High',
    hex: '#DC2626',
    bgHex: '#0B2C40',
    borderHex: 'transparent',
    textHex: '#DC2626',
    surfaceColor: '#DC2626',
    Icon: Triangle,
  },
  extreme: {
    label: 'Extreme',
    hex: '#DC2626',
    bgHex: '#0B2C40',
    borderHex: 'transparent',
    textHex: '#DC2626',
    surfaceColor: '#DC2626',
    Icon: Octagon,
  },
};

interface OpsRiskBadgeProps {
  level: RiskLevel;
  score?: number;
  size?: 'sm' | 'md' | 'lg';
  showScore?: boolean;
  className?: string;
}

export const OpsRiskBadge: React.FC<OpsRiskBadgeProps> = ({
  level,
  score,
  size = 'md',
  showScore = false,
  className = '',
}) => {
  const token = RISK_TOKENS[level] || RISK_TOKENS.low;
  const { Icon } = token;

  const sizeClasses = {
    sm: 'text-[11px] px-2 py-0.5 gap-1.5',
    md: 'text-[12px] px-2.5 py-1 gap-1.5',
    lg: 'text-[13px] px-3 py-1 gap-2 font-medium',
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
    lg: 'w-4 h-4',
  };

  return (
    <span
      className={`inline-flex items-center rounded-full font-sans font-medium ${sizeClasses[size]} ${className}`}
      style={{
        backgroundColor: token.bgHex,
        color: token.textHex,
      }}
      role="status"
      aria-label={`Risk Level: ${token.label}`}
    >
      <Icon
        className={`${iconSizes[size]} shrink-0`}
        style={{ color: token.hex, strokeWidth: 1.5 }}
      />
      <span>{token.label}</span>
      {showScore && typeof score === 'number' && (
        <span className="font-mono ml-0.5 opacity-80">
          ({score.toFixed(0)})
        </span>
      )}
    </span>
  );
};
