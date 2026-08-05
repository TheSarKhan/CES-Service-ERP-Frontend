'use client';

import { useState } from 'react';
import { History } from 'lucide-react';
import { Badge, type BadgeVariant } from '@/components/ui/badge';
import { Empty } from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert } from '@/components/ui/alert';
import { Pagination } from '@/components/ui/pagination';
import {
  SortableTableHead,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  type SortState,
} from '@/components/ui/table';
import { useStockMovements } from '@/hooks/use-inventory';
import { formatDateTime } from '@/lib/utils/format';
import { cn } from '@/lib/utils';
import type { InventoryItem, StockMovementType } from '@/types/inventory';

const PAGE_SIZE = 15;

const TYPE_LABEL: Record<StockMovementType, string> = {
  IN: 'Giriş',
  OUT: 'Çıxış',
  ADJUST: 'Sayım düzəlişi',
  TRANSFER_OUT: 'Köçürmə — çıxış',
  TRANSFER_IN: 'Köçürmə — giriş',
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
  const [sort, setSort] = useState<SortState>({ field: 'createdAt', dir: 'desc' });

  function changeSort(next: SortState) {
    setSort(next);
    setPage(1);
  }

  const { data, isLoading, isError } = useStockMovements({
    itemId: item.id,
    page,
    size: PAGE_SIZE,
    sort: sort.field,
    dir: sort.dir,
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
      <Table>
        <TableHeader>
          <TableRow>
            <SortableTableHead
              field="createdAt"
              sort={sort}
              onSortChange={changeSort}
              defaultDir="desc"
            >
              Tarix
            </SortableTableHead>
            <SortableTableHead field="movementType" sort={sort} onSortChange={changeSort}>
              Hərəkət
            </SortableTableHead>
            <SortableTableHead
              field="quantity"
              sort={sort}
              onSortChange={changeSort}
              className="r"
            >
              Miqdar
            </SortableTableHead>
            <SortableTableHead
              field="balanceAfter"
              sort={sort}
              onSortChange={changeSort}
              className="r"
            >
              Qalıq
            </SortableTableHead>
            <TableHead>Qovluq</TableHead>
            <TableHead>Səbəb</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {movements.map((movement) => {
            const incoming = movement.quantity > 0;
            return (
              <TableRow key={movement.id}>
                <TableCell>
                  {/* Both on one line each: a wrapped timestamp and a wrapped name turned every
                      row three lines tall for no gain. */}
                  <div className="whitespace-nowrap">{formatDateTime(movement.createdAt)}</div>
                  {movement.createdByName && (
                    <div className="truncate text-xs text-muted-foreground">
                      {movement.createdByName}
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant={TYPE_VARIANT[movement.movementType]} size="sm">
                    {TYPE_LABEL[movement.movementType]}
                  </Badge>
                </TableCell>
                {/* The sign is the whole point of a ledger line, so it stays even in a table. */}
                <TableCell className={cn('r mono font-bold', incoming ? 'text-ok' : 'text-danger')}>
                  {incoming ? '+' : '−'}
                  {formatQuantity(Math.abs(movement.quantity))} {item.unit}
                </TableCell>
                <TableCell className="r mono">{formatQuantity(movement.balanceAfter)}</TableCell>
                <TableCell className="text-muted-foreground">
                  {movement.nodeName ?? 'Qovluq'}
                </TableCell>
                <TableCell className="text-muted-foreground">{movement.reason ?? '—'}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

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
