import * as React from 'react';
import { cn } from '@/lib/utils';

/** Grid wrapper for KPI cards (kit `.kpi-grid`). */
export function KpiGrid({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('kpi-grid', className)} {...props} />;
}

export interface KpiCardProps {
  label: string;
  value: React.ReactNode;
  /** Optional unit suffix shown muted next to the value (kit `.u`). */
  unit?: string;
  icon?: React.ReactNode;
  /** Gold icon tile (kit `.kpi-ic.gold`). */
  goldIcon?: boolean;
  /** Hero (first) card style (kit `.kpi-hero`). */
  hero?: boolean;
  delta?: React.ReactNode;
  className?: string;
}

/** Single KPI card (kit `.kpi-card` / `.kpi-hero`). */
export function KpiCard({
  label,
  value,
  unit,
  icon,
  goldIcon,
  hero,
  delta,
  className,
}: KpiCardProps) {
  return (
    <div className={cn('kpi-card', hero && 'kpi-hero', className)}>
      <div className="kpi-top">
        <span className="kpi-lab">{label}</span>
        {icon && <span className={cn('kpi-ic', goldIcon && 'gold')}>{icon}</span>}
      </div>
      <div className="kpi-val num">
        {value}
        {unit && <span className="u">{unit}</span>}
      </div>
      {delta && <div className="kpi-delta">{delta}</div>}
    </div>
  );
}
