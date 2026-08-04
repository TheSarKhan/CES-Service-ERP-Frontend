'use client';

import { useState } from 'react';
import { Gavel, Inbox, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { CLAIM_RESOLUTION_LABEL } from '@/components/inventory/badges';
import { useWarrantyClaims } from '@/hooks/use-inventory';
import { formatDate } from '@/lib/utils/format';
import { cn } from '@/lib/utils';
import type { WarrantyClaim, WarrantyClaimStatus } from '@/types/inventory';

/** How many cards a column shows before it just reports the rest. */
const COLUMN_LIMIT = 50;

/**
 * The four columns are the claim's life, left to right: sent → answered → closed.
 *
 * Accepted and rejected sit side by side rather than merged, because the difference between them
 * is who paid — the single fact this whole module exists to record.
 */
const COLUMNS: {
  status: WarrantyClaimStatus;
  label: string;
  hint: string;
  accent: string;
  dropAccent: string;
}[] = [
  {
    status: 'SUBMITTED',
    label: 'Cavab gözlənilir',
    hint: 'Təchizatçıdan cavab yoxdur',
    accent: 'border-t-warn',
    dropAccent: 'border-warn bg-warn/5',
  },
  {
    status: 'ACCEPTED',
    label: 'Qəbul edilib',
    hint: 'Xərc təchizatçının',
    accent: 'border-t-ok',
    dropAccent: 'border-ok bg-ok/5',
  },
  {
    status: 'REJECTED',
    label: 'Rədd edilib',
    hint: 'Xərc bizim',
    accent: 'border-t-danger',
    dropAccent: 'border-danger bg-danger/5',
  },
  {
    status: 'RESOLVED',
    label: 'Bağlanıb',
    hint: 'Əvəzləmə/təmir tamamlanıb',
    accent: 'border-t-info',
    dropAccent: 'border-info bg-info/5',
  },
];

/** Whole days between a date and today. */
function daysSince(iso: string | null): number | null {
  if (!iso) return null;
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return null;
  return Math.floor((Date.now() - then) / 86_400_000);
}

function ClaimCard({
  claim,
  onDecide,
  onDelete,
  onDragStart,
  dragging,
}: {
  claim: WarrantyClaim;
  onDecide: () => void;
  onDelete: () => void;
  onDragStart: () => void;
  dragging: boolean;
}) {
  const waiting = daysSince(claim.status === 'SUBMITTED' ? claim.submittedAt : claim.decidedAt);

  return (
    <li
      draggable
      onDragStart={onDragStart}
      className={cn(
        'cursor-grab rounded-lg border border-line bg-surface p-3 transition-shadow hover:shadow-sm active:cursor-grabbing',
        dragging && 'opacity-40',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate font-semibold">{claim.targetLabel ?? '—'}</div>
          <div className="truncate text-xs text-muted-foreground">
            {claim.targetType === 'INVENTORY_ITEM_UNIT' ? 'Seriyalı vahid' : 'Məhsul'}
            {claim.claimNumber ? ` · ${claim.claimNumber}` : ''}
          </div>
        </div>
        {/* Buttons are not draggable targets — a click on them must not start a drag. */}
        <div className="flex shrink-0 items-center gap-0.5" draggable={false}>
          <button
            type="button"
            onClick={onDecide}
            className="btn btn-ghost btn-icon"
            aria-label="Nəticəni qeyd et"
            title="Nəticəni qeyd et"
          >
            <Gavel className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="btn btn-ghost btn-icon"
            aria-label="Tələbi sil"
            title="Sil"
          >
            <Trash2 className="h-3.5 w-3.5 text-danger" />
          </button>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {claim.supplier && (
          <span className="text-xs font-semibold text-muted-foreground">{claim.supplier}</span>
        )}
        {claim.resolution && (
          <Badge variant="mute" size="sm">
            {CLAIM_RESOLUTION_LABEL[claim.resolution]}
          </Badge>
        )}
      </div>

      <div className="mt-1.5 text-xs text-muted-foreground">
        {claim.status === 'SUBMITTED' ? (
          <>
            {formatDate(claim.submittedAt)}
            {waiting !== null && waiting > 0 && (
              // Ageing is the reason to look at this column at all.
              <span className={cn('ml-1', waiting >= 14 && 'font-semibold text-warn')}>
                · {waiting} gündür gözləyir
              </span>
            )}
          </>
        ) : (
          <>{claim.decidedAt ? formatDate(claim.decidedAt) : formatDate(claim.submittedAt)}</>
        )}
      </div>
    </li>
  );
}

/**
 * Claims as a board — the shape their life actually has.
 *
 * Dropping a card on a column opens the decision dialog with that outcome preselected rather than
 * flipping the status outright: the resolution, date and reason are the parts somebody will need
 * six months from now, and a drag alone cannot supply them.
 */
export function WarrantyClaimBoard({
  search,
  onDecide,
  onDelete,
  onDrop,
}: {
  search: string;
  onDecide: (claim: WarrantyClaim) => void;
  onDelete: (claim: WarrantyClaim) => void;
  onDrop: (claim: WarrantyClaim, status: WarrantyClaimStatus) => void;
}) {
  const [dragging, setDragging] = useState<WarrantyClaim | null>(null);
  const [hovered, setHovered] = useState<WarrantyClaimStatus | null>(null);

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
      {COLUMNS.map((column) => (
        <BoardColumn
          key={column.status}
          column={column}
          search={search}
          dragging={dragging}
          isHovered={hovered === column.status}
          onDragEnter={() => setHovered(column.status)}
          onDragLeave={() => setHovered((prev) => (prev === column.status ? null : prev))}
          onCardDragStart={setDragging}
          onCardDrop={() => {
            setHovered(null);
            if (dragging && dragging.status !== column.status) {
              onDrop(dragging, column.status);
            }
            setDragging(null);
          }}
          onDecide={onDecide}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}

function BoardColumn({
  column,
  search,
  dragging,
  isHovered,
  onDragEnter,
  onDragLeave,
  onCardDragStart,
  onCardDrop,
  onDecide,
  onDelete,
}: {
  column: (typeof COLUMNS)[number];
  search: string;
  dragging: WarrantyClaim | null;
  isHovered: boolean;
  onDragEnter: () => void;
  onDragLeave: () => void;
  onCardDragStart: (claim: WarrantyClaim) => void;
  onCardDrop: () => void;
  onDecide: (claim: WarrantyClaim) => void;
  onDelete: (claim: WarrantyClaim) => void;
}) {
  // One query per column: each is small, cached on its own key, and refetched independently when
  // a card moves.
  const { data, isLoading } = useWarrantyClaims({
    status: column.status,
    search: search || undefined,
    page: 1,
    size: COLUMN_LIMIT,
  });

  const claims = data?.items ?? [];
  const total = data?.meta.total_items ?? 0;
  // Dropping a card where it already is would only reopen the dialog for no reason.
  const isDropTarget = Boolean(dragging) && dragging?.status !== column.status;

  return (
    <div
      onDragOver={(e) => {
        if (!isDropTarget) return;
        e.preventDefault();
      }}
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDrop={onCardDrop}
      className={cn(
        'flex min-h-[220px] flex-col rounded-xl border border-t-4 border-line bg-graphite-50 p-3 transition-colors',
        column.accent,
        isDropTarget && isHovered && column.dropAccent,
      )}
    >
      <div className="mb-2">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-sm font-bold">{column.label}</span>
          <span className="mono text-sm text-muted-foreground">{total}</span>
        </div>
        <div className="text-xs text-muted-foreground">{column.hint}</div>
      </div>

      {isLoading && (
        <div className="space-y-2">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      )}

      {!isLoading && claims.length === 0 && (
        <div className="flex flex-1 flex-col items-center justify-center py-6 text-center">
          <Inbox className="mb-1 h-6 w-6 text-muted-foreground/50" />
          <span className="text-xs text-muted-foreground">Boşdur</span>
        </div>
      )}

      {!isLoading && claims.length > 0 && (
        <ul className="space-y-2">
          {claims.map((claim) => (
            <ClaimCard
              key={claim.id}
              claim={claim}
              dragging={dragging?.id === claim.id}
              onDragStart={() => onCardDragStart(claim)}
              onDecide={() => onDecide(claim)}
              onDelete={() => onDelete(claim)}
            />
          ))}
        </ul>
      )}

      {/* Silently truncating would read as "this is all of them". */}
      {total > COLUMN_LIMIT && (
        <div className="mt-2 text-center text-xs text-muted-foreground">
          + daha {total - COLUMN_LIMIT} tələb — cədvəl görünüşündə baxın
        </div>
      )}
    </div>
  );
}
