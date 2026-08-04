'use client';

import { useState } from 'react';
import { Boxes } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableTools,
} from '@/components/ui/table';
import { Empty } from '@/components/ui/empty';
import { Alert } from '@/components/ui/alert';
import { Pagination } from '@/components/ui/pagination';
import { WarrantyStatusBadge } from '@/components/inventory/badges';
import { ItemDetailDialog } from '@/components/inventory/ItemDetailDialog';
import { useExpiringLots } from '@/hooks/use-inventory';
import { formatDate } from '@/lib/utils/format';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 20;

const HORIZONS = [
  { value: 30, label: 'Növbəti 30 gün' },
  { value: 90, label: 'Növbəti 90 gün' },
  { value: 180, label: 'Növbəti 6 ay' },
  { value: 365, label: 'Növbəti 1 il' },
];

/**
 * Batches running out of time, soonest first.
 *
 * Lives beside the warranty search because it answers the same question in a different currency:
 * something is about to stop being usable, and there is a window to act before it does.
 */
export function ExpiringLotsPanel() {
  const [withinDays, setWithinDays] = useState(90);
  const [page, setPage] = useState(1);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  const { data, isLoading, isError } = useExpiringLots(withinDays, page, PAGE_SIZE);
  const lots = data?.items ?? [];
  const meta = data?.meta;

  return (
    <div>
      <TableTools>
        <div className="tt-left">
          <h3>Bitmək üzrə partiyalar</h3>
          <span className="muted">{meta ? `Cəmi ${meta.total_items}` : 'Yüklənir...'}</span>
        </div>
        <div className="tt-right">
          <select
            className="h-9 rounded-lg border border-line bg-white px-2 text-sm"
            value={withinDays}
            onChange={(e) => {
              setWithinDays(Number(e.target.value));
              setPage(1);
            }}
          >
            {HORIZONS.map((h) => (
              <option key={h.value} value={h.value}>
                {h.label}
              </option>
            ))}
          </select>
        </div>
      </TableTools>

      {isError && (
        <Alert variant="danger" title="Yüklənmədi">
          Partiya siyahısı yüklənə bilmədi.
        </Alert>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Məhsul</TableHead>
            <TableHead>Partiya</TableHead>
            <TableHead>Yer</TableHead>
            <TableHead className="r">Qalıq</TableHead>
            <TableHead>Bitir</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading &&
            Array.from({ length: 4 }).map((_, i) => (
              <TableRow key={`sk-${i}`}>
                {Array.from({ length: 5 }).map((__, c) => (
                  <TableCell key={`sk-${i}-${c}`}>
                    <span className="skel w-70 block" />
                  </TableCell>
                ))}
              </TableRow>
            ))}

          {!isLoading &&
            lots.map((lot) => (
              <TableRow
                key={lot.id}
                className="cursor-pointer"
                onClick={() => setSelectedItemId(lot.itemId)}
              >
                <TableCell>
                  <b className="font-semibold">{lot.itemName}</b>
                </TableCell>
                <TableCell className="mono">{lot.lotNumber}</TableCell>
                <TableCell>
                  <span className="text-muted-foreground">{lot.nodeName ?? '—'}</span>
                </TableCell>
                <TableCell className="r mono">{lot.quantity}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-semibold">{formatDate(lot.expiryDate)}</span>
                    <WarrantyStatusBadge status={lot.expiryStatus} />
                  </div>
                  {lot.daysRemaining !== null && (
                    <div
                      className={cn(
                        'text-xs',
                        lot.daysRemaining < 0
                          ? 'text-danger'
                          : lot.daysRemaining <= 30
                            ? 'text-warn'
                            : 'text-muted-foreground',
                      )}
                    >
                      {lot.daysRemaining < 0
                        ? `${Math.abs(lot.daysRemaining)} gün keçib`
                        : `${lot.daysRemaining} gün qalıb`}
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
        </TableBody>
      </Table>

      {!isLoading && lots.length === 0 && (
        <Empty
          title="Bitmək üzrə partiya yoxdur"
          description="Seçilmiş müddətdə son istifadə tarixi çatan partiya yoxdur."
          icon={<Boxes className="mx-auto h-12 w-12" />}
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
