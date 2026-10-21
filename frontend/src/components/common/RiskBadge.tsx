import React from 'react';
import { ShieldCheck, AlertTriangle, AlertOctagon, HelpCircle } from 'lucide-react';

export type RiskLevel = 'low' | 'medium' | 'high' | 'unknown';

interface RiskBadgeProps {
  level: RiskLevel;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
}

export const RISK_CONFIG: Record<
  RiskLevel,
  {
    label: string;
    bgClass: string;
    textClass: string;
    borderClass: string;
    hex: string;
    Icon: React.ComponentType<{ className?: string }>;
  }
> = {
  low: {
    label: 'Low Risk',
    bgClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    textClass: 'text-emerald-700',
    borderClass: 'border-emerald-200',
    hex: '#16A34A',
    Icon: ShieldCheck,
  },
  medium: {
    label: 'Medium Risk',
    bgClass: 'bg-amber-50 text-amber-800 border-amber-200',
    textClass: 'text-amber-700',
    borderClass: 'border-amber-200',
    hex: '#F59E0B',
    Icon: AlertTriangle,
  },
  high: {
    label: 'High Risk',
    bgClass: 'bg-rose-50 text-rose-800 border-rose-200',
    textClass: 'text-rose-700',
    borderClass: 'border-rose-200',
    hex: '#DC2626',
    Icon: AlertOctagon,
  },
  unknown: {
    label: 'Unknown / No Data',
    bgClass: 'bg-slate-100 text-slate-700 border-slate-200',
    textClass: 'text-slate-600',
    borderClass: 'border-slate-200',
    hex: '#94A3B8',
    Icon: HelpCircle,
  },
};

export const RiskBadge: React.FC<RiskBadgeProps> = ({
  level,
  size = 'md',
  showIcon = true,
  className = '',
}) => {
  const config = RISK_CONFIG[level] || RISK_CONFIG.unknown;
  const { Icon } = config;

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5 font-medium',
    lg: 'text-sm px-3.5 py-1.5 gap-2 font-semibold',
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
    lg: 'w-4 h-4',
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border ${config.bgClass} ${sizeClasses[size]} ${className}`}
      role="status"
      aria-label={`Risk Level: ${config.label}`}
    >
      {showIcon && <Icon className={`${iconSizes[size]} shrink-0`} />}
      <span>{config.label}</span>
    </span>
  );
};
