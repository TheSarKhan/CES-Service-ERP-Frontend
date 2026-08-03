'use client';

import { ShieldAlert, ShieldX } from 'lucide-react';
import { useWarrantySummary } from '@/hooks/use-inventory';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

function Stat({
  tone,
  icon,
  label,
  total,
  items,
  units,
}: {
  tone: 'warn' | 'danger';
  icon: React.ReactNode;
  label: string;
  total: number;
  items: number;
  units: number;
}) {
  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-xl border p-3',
        tone === 'warn' ? 'border-warn/40 bg-warn/5' : 'border-danger/40 bg-danger/5',
      )}
    >
      <span className={cn('mt-0.5 shrink-0', tone === 'warn' ? 'text-warn' : 'text-danger')}>
        {icon}
      </span>
      <div>
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-xl font-extrabold leading-tight">{total}</div>
        <div className="mt-0.5 text-xs text-muted-foreground">
          {items} məhsul · {units} vahid
        </div>
      </div>
    </div>
  );
}

/**
 * Standing "needs attention" band above the warranty search.
 *
 * Search only answers questions you already thought to ask — this makes the two states that need
 * chasing visible without one. It stays out of the way entirely when nothing is expiring.
 */
export function WarrantyExpiryBand() {
  const { data, isLoading } = useWarrantySummary();

  if (isLoading) return <Skeleton className="mb-4 h-20 w-full" />;
  if (!data || (data.expiringSoonTotal === 0 && data.expiredTotal === 0)) return null;

  return (
    <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
      {data.expiringSoonTotal > 0 && (
        <Stat
          tone="warn"
          icon={<ShieldAlert className="h-5 w-5" />}
          label="Zəmanəti bitmək üzrə (30 gün)"
          total={data.expiringSoonTotal}
          items={data.expiringSoonItems}
          units={data.expiringSoonUnits}
        />
      )}
      {data.expiredTotal > 0 && (
        <Stat
          tone="danger"
          icon={<ShieldX className="h-5 w-5" />}
          label="Zəmanəti bitib"
          total={data.expiredTotal}
          items={data.expiredItems}
          units={data.expiredUnits}
        />
      )}
    </div>
  );
}
