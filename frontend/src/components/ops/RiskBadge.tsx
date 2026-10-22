import React from 'react';
import { ShieldCheck, AlertTriangle, AlertOctagon, Flame } from 'lucide-react';
import { RiskLevel } from '../../types';

export const RISK_TOKENS: Record<
  RiskLevel,
  {
    label: string;
    hex: string;
    bgHex: string;
    borderHex: string;
    textHex: string;
    Icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  }
> = {
  low: {
    label: 'SAFE / LOW',
    hex: '#5C9B72',
    bgHex: 'rgba(92, 155, 114, 0.16)',
    borderHex: 'rgba(92, 155, 114, 0.35)',
    textHex: '#7DC798',
    Icon: ShieldCheck,
  },
  moderate: {
    label: 'ADVISORY / MODERATE',
    hex: '#C99A45',
    bgHex: 'rgba(201, 154, 69, 0.16)',
    borderHex: 'rgba(201, 154, 69, 0.35)',
    textHex: '#E5B662',
    Icon: AlertTriangle,
  },
  high: {
    label: 'HIGH RISK',
    hex: '#C96A50',
    bgHex: 'rgba(201, 106, 80, 0.16)',
    borderHex: 'rgba(201, 106, 80, 0.35)',
    textHex: '#E68A72',
    Icon: AlertOctagon,
  },
  extreme: {
    label: 'EXTREME RISK',
    hex: '#B74848',
    bgHex: 'rgba(183, 72, 72, 0.16)',
    borderHex: 'rgba(183, 72, 72, 0.35)',
    textHex: '#D96B6B',
    Icon: Flame,
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
    sm: 'text-[10px] px-1.5 py-0.5 gap-1',
    md: 'text-[11px] px-2 py-0.5 gap-1.5 font-medium',
    lg: 'text-xs px-2.5 py-1 gap-2 font-semibold',
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
    lg: 'w-4 h-4',
  };

  return (
    <span
      className={`inline-flex items-center rounded border font-mono tracking-tight uppercase ${sizeClasses[size]} ${className}`}
      style={{
        backgroundColor: token.bgHex,
        borderColor: token.borderHex,
        color: token.textHex,
      }}
      role="status"
      aria-label={`Operational Risk Level: ${token.label}`}
    >
      <span
        className="w-1.5 h-1.5 rounded-full shrink-0"
        style={{ backgroundColor: token.hex }}
      />
      <Icon className={`${iconSizes[size]} shrink-0`} style={{ color: token.hex }} />
      <span>{token.label}</span>
      {showScore && typeof score === 'number' && (
        <span className="font-mono font-semibold ml-0.5">
          ({score.toFixed(0)})
        </span>
      )}
    </span>
  );
};
