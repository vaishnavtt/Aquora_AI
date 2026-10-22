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
    hex: '#3F8F64',
    bgHex: '#EDF5F0',
    borderHex: '#C5DFD0',
    textHex: '#25583E',
    Icon: ShieldCheck,
  },
  moderate: {
    label: 'ADVISORY / MODERATE',
    hex: '#B98225',
    bgHex: '#FAF4E8',
    borderHex: '#EADBBE',
    textHex: '#7C5311',
    Icon: AlertTriangle,
  },
  high: {
    label: 'HIGH RISK',
    hex: '#C8644D',
    bgHex: '#FDF1EE',
    borderHex: '#F4D2C9',
    textHex: '#8C3926',
    Icon: AlertOctagon,
  },
  extreme: {
    label: 'EXTREME RISK',
    hex: '#A83E45',
    bgHex: '#FBECEE',
    borderHex: '#EEC2C6',
    textHex: '#732227',
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
