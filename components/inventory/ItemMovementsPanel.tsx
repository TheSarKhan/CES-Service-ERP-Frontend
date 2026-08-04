'use client';

import { useState } from 'react';
import { History } from 'lucide-react';
import { Badge, type BadgeVariant } from '@/components/ui/badge';
import { Empty } from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert } from '@/components/ui/alert';
import { Pagination } from '@/components/ui/pagination';
import { useStockMovements } from '@/hooks/use-inventory';
import { formatDateTime } from '@/lib/utils/format';
import { cn } from '@/lib/utils';
import type { InventoryItem, StockMovementType } from '@/types/inventory';

const PAGE_SIZE = 15;

const TYPE_LABEL: Record<StockMovementType, string> = {
  IN: 'Giriş',
  OUT: 'Çıxış',
  ADJUST: 'Sayım düzəlişi',
  TRANSFER_OUT: 'Transfer — çıxış',
  TRANSFER_IN: 'Transfer — giriş',
  UNIT_IN: 'Vahid qeydiyyatı',
  UNIT_OUT: 'Vahid çıxışı',
};

const TYPE_VARIANT: Record<StockMovementType, BadgeVariant> = {
  IN: 'ok',
  OUT: 'warn',
  ADJUST: 'info',
  TRANSFER_OUT: 'warn',
  TRANSFER_IN: 'ok',
  UNIT_IN: 'ok',
  UNIT_OUT: 'warn',
};

/** Trailing zeros from numeric(12,3) read as noise in a list of movements. */
function formatQuantity(value: number): string {
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(3)));
}

/**
 * Stock history for one product — every movement, newest first.
 *
 * Each line keeps the balance it left behind, so a row still reads correctly no matter what
 * happened afterwards. Rows are never edited: a mistaken movement is closed with its opposite,
 * which is why a correction shows up as its own line rather than silently rewriting an old one.
 */
export function ItemMovementsPanel({ item }: { item: InventoryItem }) {
  const [page, setPage] = useState(1);
  const { data, isLoading, isError } = useStockMovements({
    itemId: item.id,
    page,
    size: PAGE_SIZE,
  });

  const movements = data?.items ?? [];
  const meta = data?.meta;

  if (isError) {
    return (
      <Alert variant="danger" title="Yüklənmədi">
        Hərəkət tarixçəsi yüklənə bilmədi.
      </Alert>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    );
  }

  if (movements.length === 0) {
    return (
      <Empty
        title="Hərəkət yoxdur"
        description="Bu məhsulla bağlı hələ heç bir stok əməliyyatı qeyd olunmayıb."
        icon={<History className="mx-auto h-12 w-12" />}
      />
    );
  }

  return (
    <div>
      <ul className="space-y-1.5">
        {movements.map((movement) => {
          const incoming = movement.quantity > 0;
          return (
            <li
              key={movement.id}
              className="rounded-lg border border-line px-3 py-2.5 text-sm"
            >
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={TYPE_VARIANT[movement.movementType]} size="sm">
                  {TYPE_LABEL[movement.movementType]}
                </Badge>
                <span className={cn('mono font-bold', incoming ? 'text-ok' : 'text-danger')}>
                  {incoming ? '+' : '−'}
                  {formatQuantity(Math.abs(movement.quantity))} {item.unit}
                </span>
                <span className="text-muted-foreground">{movement.nodeName ?? 'Qovluq'}</span>
                <span className="ml-auto mono text-xs text-muted-foreground">
                  qalıq: {formatQuantity(movement.balanceAfter)}
                </span>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                <span>{formatDateTime(movement.createdAt)}</span>
                {movement.createdByName && <span>· {movement.createdByName}</span>}
                {movement.reason && <span>· {movement.reason}</span>}
              </div>
            </li>
          );
        })}
      </ul>

      {meta && meta.total_items > PAGE_SIZE && (
        <Pagination
          page={page}
          totalPages={meta.total_pages}
          totalItems={meta.total_items}
          pageSize={meta.size || PAGE_SIZE}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}
