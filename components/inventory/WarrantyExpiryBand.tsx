'use client';

import { FileWarning, ShieldAlert, ShieldX } from 'lucide-react';
import { useWarrantySummary } from '@/hooks/use-inventory';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

type Tone = 'warn' | 'danger' | 'info';

const TONE_CLASS: Record<Tone, { box: string; icon: string; active: string }> = {
  warn: { box: 'border-warn/40 bg-warn/5', icon: 'text-warn', active: 'ring-2 ring-warn' },
  danger: { box: 'border-danger/40 bg-danger/5', icon: 'text-danger', active: 'ring-2 ring-danger' },
  info: { box: 'border-info/40 bg-info/5', icon: 'text-info', active: 'ring-2 ring-info' },
};

function Stat({
  tone,
  icon,
  label,
  total,
  detail,
  active,
  onClick,
}: {
  tone: Tone;
  icon: React.ReactNode;
  label: string;
  total: number;
  detail: string;
  active?: boolean;
  onClick?: () => void;
}) {
  const classes = TONE_CLASS[tone];
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={cn(
        'flex items-start gap-3 rounded-xl border p-3 text-left transition-shadow',
        classes.box,
        onClick && 'hover:shadow-sm',
        active && classes.active,
      )}
    >
      <span className={cn('mt-0.5 shrink-0', classes.icon)}>{icon}</span>
      <div>
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-xl font-extrabold leading-tight">{total}</div>
        <div className="mt-0.5 text-xs text-muted-foreground">{detail}</div>
      </div>
    </button>
  );
}

/** Which card the current filter state corresponds to, so the band can mark it. */
export type ExpiryBandSelection = 'EXPIRING_SOON' | 'EXPIRED' | 'OPEN_CLAIMS' | null;

/**
 * Standing "needs attention" band above the warranty search.
 *
 * Search only answers questions you already thought to ask — this makes the states that need
 * chasing visible without one, and clicking a card filters the list down to it so the number is a
 * way in rather than a dead end. It stays out of the way entirely when nothing needs attention.
 */
export function WarrantyExpiryBand({
  selected,
  onSelect,
}: {
  selected?: ExpiryBandSelection;
  onSelect?: (selection: ExpiryBandSelection) => void;
}) {
  const { data, isLoading } = useWarrantySummary();

  if (isLoading) return <Skeleton className="mb-4 h-20 w-full" />;
  if (!data || (data.expiringSoonTotal === 0 && data.expiredTotal === 0 && data.openClaims === 0)) {
    return null;
  }

  const toggle = (value: Exclude<ExpiryBandSelection, null>) => () =>
    onSelect?.(selected === value ? null : value);

  return (
    <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {data.expiringSoonTotal > 0 && (
        <Stat
          tone="warn"
          icon={<ShieldAlert className="h-5 w-5" />}
          label="Zəmanəti bitmək üzrə (30 gün)"
          total={data.expiringSoonTotal}
          detail={`${data.expiringSoonItems} məhsul · ${data.expiringSoonUnits} vahid`}
          active={selected === 'EXPIRING_SOON'}
          onClick={onSelect && toggle('EXPIRING_SOON')}
        />
      )}
      {data.expiredTotal > 0 && (
        <Stat
          tone="danger"
          icon={<ShieldX className="h-5 w-5" />}
          label="Zəmanəti bitib"
          total={data.expiredTotal}
          detail={`${data.expiredItems} məhsul · ${data.expiredUnits} vahid`}
          active={selected === 'EXPIRED'}
          onClick={onSelect && toggle('EXPIRED')}
        />
      )}
      {data.openClaims > 0 && (
        <Stat
          tone="info"
          icon={<FileWarning className="h-5 w-5" />}
          label="Cavabı gözlənilən tələb"
          total={data.openClaims}
          detail="Təchizatçıdan cavab yoxdur"
          active={selected === 'OPEN_CLAIMS'}
          onClick={onSelect && toggle('OPEN_CLAIMS')}
        />
      )}
    </div>
  );
}
