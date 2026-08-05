'use client';

import { useState } from 'react';
import { PackageCheck } from 'lucide-react';
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
import { Empty } from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert } from '@/components/ui/alert';
import { Pagination } from '@/components/ui/pagination';
import { StockLevelBadge } from '@/components/inventory/badges';
import { ItemDetailDialog } from '@/components/inventory/ItemDetailDialog';
import { useLowStockItems } from '@/hooks/use-inventory';
import { locationSummary } from '@/lib/utils/stock';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 20;

/**
 * Products that have run below their threshold, worst shortfall first.
 *
 * The threshold column shows what was breached — the critical one when it exists, otherwise the
 * reorder point — because "12 left" only means something next to the number it fell under.
 */
export function LowStockPanel({ criticalOnly }: { criticalOnly: boolean }) {
  const [page, setPage] = useState(1);
  // No default sort: the listing's own "worst shortfall first" is the point of the screen, and it
  // only stays in force while nothing else is chosen.
  const [sort, setSort] = useState<SortState | null>(null);

  function changeSort(next: SortState) {
    setSort(next);
    setPage(1);
  }
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const { data, isLoading, isError } = useLowStockItems(criticalOnly, page, PAGE_SIZE, sort?.field, sort?.dir);

  const items = data?.items ?? [];
  const meta = data?.meta;

  if (isError) {
    return (
      <Alert variant="danger" title="Yüklənmədi">
        Stok xəbərdarlıqları yüklənə bilmədi.
      </Alert>
    );
  }

  return (
    <div>
      <Table>
        <TableHeader>
          <TableRow>
            <SortableTableHead field="name" sort={sort} onSortChange={changeSort}>
              Məhsul
            </SortableTableHead>
            <TableHead>Yerlər</TableHead>
            <TableHead className="r">Qalıq</TableHead>
            <SortableTableHead field="min_quantity" sort={sort} onSortChange={changeSort} className="r">
              Hədd
            </SortableTableHead>
            <TableHead>Vəziyyət</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading &&
            Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={`sk-${i}`}>
                {Array.from({ length: 5 }).map((__, c) => (
                  <TableCell key={`sk-${i}-${c}`}>
                    <span className="skel w-70 block" />
                  </TableCell>
                ))}
              </TableRow>
            ))}

          {!isLoading &&
            items.map((item) => {
              const threshold = item.criticalQuantity ?? item.minQuantity;
              return (
                <TableRow
                  key={item.id}
                  className="cursor-pointer"
                  onClick={() => setSelectedItemId(item.id)}
                >
                  <TableCell>
                    <b className="font-semibold">{item.name}</b>
                    <div className="mono text-xs text-muted-foreground">{item.sku}</div>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs text-muted-foreground">{locationSummary(item)}</span>
                  </TableCell>
                  <TableCell className="r">
                    <span
                      className={cn(
                        'mono font-bold',
                        item.stockLevel === 'CRITICAL' ? 'text-danger' : 'text-warn',
                      )}
                    >
                      {item.totalQuantity}
                    </span>{' '}
                    <span className="text-xs text-muted-foreground">{item.unit}</span>
                  </TableCell>
                  <TableCell className="r">
                    <span className="mono text-muted-foreground">{threshold ?? '—'}</span>
                  </TableCell>
                  <TableCell>
                    <StockLevelBadge level={item.stockLevel} />
                  </TableCell>
                </TableRow>
              );
            })}
        </TableBody>
      </Table>

      {!isLoading && items.length === 0 && (
        <Empty
          title="Hər şey qaydasındadır"
          description={
            criticalOnly
              ? 'Kritik həddən aşağı məhsul yoxdur.'
              : 'Təyin edilmiş həddən aşağı düşən məhsul yoxdur.'
          }
          icon={<PackageCheck className="mx-auto h-12 w-12" />}
        />
      )}

      {!isLoading && meta && meta.total_items > PAGE_SIZE && (
        <Pagination
          page={page}
          totalPages={meta.total_pages}
          totalItems={meta.total_items}
          pageSize={meta.size || PAGE_SIZE}
          onPageChange={setPage}
        />
      )}

      <ItemDetailDialog
        open={Boolean(selectedItemId)}
        onOpenChange={(open) => !open && setSelectedItemId(null)}
        itemId={selectedItemId}
      />
    </div>
  );
}
