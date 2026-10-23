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
    bgClass: 'bg-[rgba(92,155,114,0.16)] text-[#7DC798] border-[rgba(92,155,114,0.35)]',
    textClass: 'text-[#5C9B72]',
    borderClass: 'border-[rgba(92,155,114,0.35)]',
    hex: '#5C9B72',
    Icon: ShieldCheck,
  },
  medium: {
    label: 'Medium Risk',
    bgClass: 'bg-[rgba(201,154,69,0.16)] text-[#E5B662] border-[rgba(201,154,69,0.35)]',
    textClass: 'text-[#C99A45]',
    borderClass: 'border-[rgba(201,154,69,0.35)]',
    hex: '#C99A45',
    Icon: AlertTriangle,
  },
  high: {
    label: 'High Risk',
    bgClass: 'bg-[rgba(201,106,80,0.16)] text-[#E68A72] border-[rgba(201,106,80,0.35)]',
    textClass: 'text-[#C96A50]',
    borderClass: 'border-[rgba(201,106,80,0.35)]',
    hex: '#C96A50',
    Icon: AlertOctagon,
  },
  unknown: {
    label: 'Unknown / No Data',
    bgClass: 'bg-[#23292C] text-[#9BA5A5] border-[#384145]',
    textClass: 'text-[#9BA5A5]',
    borderClass: 'border-[#384145]',
    hex: '#9BA5A5',
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
