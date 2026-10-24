import React from 'react';
import { CheckCircle2, CircleDot, AlertTriangle, AlertOctagon } from 'lucide-react';
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
    label: 'Safe',
    hex: '#16A34A',
    bgHex: '#F0FDF4',
    borderHex: '#BBF7D0',
    textHex: '#15803D',
    surfaceColor: '#16A34A',
    Icon: CheckCircle2,
  },
  moderate: {
    label: 'Watch',
    hex: '#D97706',
    bgHex: '#FFFBEB',
    borderHex: '#FDE68A',
    textHex: '#B45309',
    surfaceColor: '#D97706',
    Icon: CircleDot,
  },
  high: {
    label: 'High',
    hex: '#EA580C',
    bgHex: '#FFF7ED',
    borderHex: '#FED7AA',
    textHex: '#C2410C',
    surfaceColor: '#EA580C',
    Icon: AlertTriangle,
  },
  extreme: {
    label: 'Extreme',
    hex: '#DC2626',
    bgHex: '#FEF2F2',
    borderHex: '#FECACA',
    textHex: '#B91C1C',
    surfaceColor: '#DC2626',
    Icon: AlertOctagon,
  },
};

export const getRiskToken = (level: string | null | undefined) => {
  if (!level) {
    return {
      label: 'Unrated',
      hex: '#64748B',
      bgHex: '#F1F5F9',
      borderHex: '#E2E8F0',
      textHex: '#64748B',
      surfaceColor: '#94A3B8',
      Icon: CircleDot,
    };
  }
  const normalized = level.toLowerCase() as RiskLevel;
  return RISK_TOKENS[normalized] || {
    label: 'Unrated',
    hex: '#64748B',
    bgHex: '#F1F5F9',
    borderHex: '#E2E8F0',
    textHex: '#64748B',
    surfaceColor: '#94A3B8',
    Icon: CircleDot,
  };
};

interface OpsRiskBadgeProps {
  level: RiskLevel | string | null | undefined;
  score?: number | null;
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
  const token = getRiskToken(level);
  const { Icon } = token;

  const sizeClasses = {
    sm: 'text-[11px] px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5',
    lg: 'text-xs px-3 py-1.5 gap-2 font-semibold',
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
    lg: 'w-4 h-4',
  };

  return (
    <span
      className={`inline-flex items-center rounded-full font-medium border shadow-2xs ${sizeClasses[size]} ${className}`}
      style={{
        backgroundColor: token.bgHex,
        borderColor: token.borderHex,
        color: token.textHex,
      }}
      role="status"
      aria-label={`Risk Level: ${token.label}`}
    >
      <Icon
        className={`${iconSizes[size]} shrink-0`}
        style={{ color: token.hex }}
      />
      <span>{token.label}</span>
      {showScore && typeof score === 'number' && !isNaN(score) && (
        <span className="font-mono font-bold text-[11px] opacity-90">
          ({Math.round(score)})
        </span>
      )}
    </span>
  );
};
