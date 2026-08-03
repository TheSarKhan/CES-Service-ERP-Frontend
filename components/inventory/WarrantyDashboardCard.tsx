'use client';

import Link from 'next/link';
import { ArrowRight, ShieldAlert, ShieldCheck } from 'lucide-react';
import { useWarrantySummary } from '@/hooks/use-inventory';
import { useAuthStore } from '@/store/auth-store';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

/**
 * Dashboard card for warranties needing attention.
 *
 * Deliberately still rendered when the count is zero — unlike the in-page band, this is the
 * "start of day" surface, and a card that vanishes silently can't be distinguished from one that
 * failed to load. It just shows the all-clear state instead.
 */
export function WarrantyDashboardCard() {
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const { data, isLoading } = useWarrantySummary();

  if (!hasPermission('WH_READ')) return null;
  if (isLoading) return <Skeleton className="h-32 w-full" />;
  if (!data) return null;

  const needsAttention = data.expiringSoonTotal + data.expiredTotal;
  const allClear = needsAttention === 0;

  return (
    <Link
      href="/warehouse/warranty"
      className={cn(
        'card-basic flex flex-col gap-3 p-4 transition-shadow hover:shadow-md',
        !allClear && 'border-warn/50',
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {allClear ? (
            <ShieldCheck className="h-5 w-5 text-ok" />
          ) : (
            <ShieldAlert className="h-5 w-5 text-warn" />
          )}
          <span className="text-sm font-bold">Zəmanət</span>
        </div>
        <ArrowRight className="h-4 w-4 text-muted-foreground" />
      </div>

      {allClear ? (
        <p className="text-sm text-muted-foreground">
          Yaxın 30 gündə bitən zəmanət yoxdur.
        </p>
      ) : (
        <div className="flex flex-wrap gap-5">
          {data.expiringSoonTotal > 0 && (
            <div>
              <div className="text-2xl font-extrabold leading-none text-warn">
                {data.expiringSoonTotal}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">Bitmək üzrə (30 gün)</div>
            </div>
          )}
          {data.expiredTotal > 0 && (
            <div>
              <div className="text-2xl font-extrabold leading-none text-danger">
                {data.expiredTotal}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">Bitib</div>
            </div>
          )}
        </div>
      )}
    </Link>
  );
}
