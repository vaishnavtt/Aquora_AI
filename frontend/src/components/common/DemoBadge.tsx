import React from 'react';

interface DemoBadgeProps {
  /** Optional extra tooltip text. Defaults to standard synthetic-data notice. */
  tooltip?: string;
  className?: string;
}

/**
 * A small amber badge that indicates synthetic, unvalidated, or demo data.
 * Should appear wherever data is not sourced from the live backend.
 */
export const DemoBadge: React.FC<DemoBadgeProps> = ({
  tooltip = 'This value is synthetic or unvalidated and is for demonstration only.',
  className = '',
}) => {
  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide bg-amber-400 text-amber-900 select-none ${className}`}
      title={tooltip}
      aria-label={`Demo data: ${tooltip}`}
    >
      {/* Dot indicator */}
      <span className="w-1.5 h-1.5 rounded-full bg-amber-700 shrink-0" aria-hidden="true" />
      Demo Data
    </span>
  );
};
