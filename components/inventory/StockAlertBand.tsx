'use client';

import { PackageMinus, PackageX } from 'lucide-react';
import { useStockAlertSummary } from '@/hooks/use-inventory';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

/** Which card the current filter corresponds to, so the band can mark it. */
export type StockBandSelection = 'LOW' | 'CRITICAL' | null;

/**
 * Standing "running out" band above the warehouse.
 *
 * Same idea as the warranty band: a number nobody has to go looking for, and clicking it filters
 * the list rather than leaving you to search for what it counted. Hidden entirely when nothing is
 * below its threshold — a band that says "all fine" every day gets ignored on the day it doesn't.
 */
export function StockAlertBand({
  selected,
  onSelect,
}: {
  selected?: StockBandSelection;
  onSelect?: (selection: StockBandSelection) => void;
}) {
  const { data, isLoading } = useStockAlertSummary();

  if (isLoading) return <Skeleton className="mb-4 h-20 w-full" />;
  if (!data || data.total === 0) return null;

  const toggle = (value: Exclude<StockBandSelection, null>) => () =>
    onSelect?.(selected === value ? null : value);

  return (
    <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
      {data.critical > 0 && (
        <button
          type="button"
          onClick={onSelect && toggle('CRITICAL')}
          disabled={!onSelect}
          className={cn(
            'flex items-start gap-3 rounded-xl border border-danger/40 bg-danger/5 p-3 text-left transition-shadow',
            onSelect && 'hover:shadow-sm',
            selected === 'CRITICAL' && 'ring-2 ring-danger',
          )}
        >
          <PackageX className="mt-0.5 h-5 w-5 shrink-0 text-danger" />
          <div>
            <div className="text-xs text-muted-foreground">Kritik həddən aşağı</div>
            <div className="text-xl font-extrabold leading-tight">{data.critical}</div>
            <div className="mt-0.5 text-xs text-muted-foreground">İş dayana bilər</div>
          </div>
        </button>
      )}
      {data.low > 0 && (
        <button
          type="button"
          onClick={onSelect && toggle('LOW')}
          disabled={!onSelect}
          className={cn(
            'flex items-start gap-3 rounded-xl border border-warn/40 bg-warn/5 p-3 text-left transition-shadow',
            onSelect && 'hover:shadow-sm',
            selected === 'LOW' && 'ring-2 ring-warn',
          )}
        >
          <PackageMinus className="mt-0.5 h-5 w-5 shrink-0 text-warn" />
          <div>
            <div className="text-xs text-muted-foreground">Minimum həddən aşağı</div>
            <div className="text-xl font-extrabold leading-tight">{data.low}</div>
            <div className="mt-0.5 text-xs text-muted-foreground">Sifariş vaxtıdır</div>
          </div>
        </button>
      )}
    </div>
  );
}
