'use client';

import { useState } from 'react';
import { Search, ShieldAlert } from 'lucide-react';
import { useInventoryUnitSearch } from '@/hooks/use-inventory';
import { Input } from '@/components/ui/input';
import { Empty } from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert } from '@/components/ui/alert';
import { Pagination } from '@/components/ui/pagination';
import { UnitStatusBadge, WarrantyStatusBadge } from '@/components/inventory/badges';
import { ItemDetailDialog } from '@/components/inventory/ItemDetailDialog';
import { formatDate } from '@/lib/utils/format';
import { WarrantyExpiryBand } from '@/components/inventory/WarrantyExpiryBand';
import type { InventoryUnitStatus } from '@/types/inventory';

const PAGE_SIZE = 20;

const STATUS_OPTIONS: { value: InventoryUnitStatus | ''; label: string }[] = [
  { value: '', label: 'Bütün statuslar' },
  { value: 'IN_STOCK', label: 'Stokda' },
  { value: 'IN_USE', label: 'İstifadədə' },
  { value: 'FAILED', label: 'Sıradan çıxıb' },
  { value: 'DISPOSED', label: 'Silinib' },
  { value: 'RETURNED', label: 'Qaytarılıb' },
];

/** Global search across every serialized unit — by serial number, item name/SKU, or lifecycle status. */
export function WarrantySearchPanel() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<InventoryUnitStatus | ''>('');
  const [page, setPage] = useState(1);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  const { data, isLoading, isError } = useInventoryUnitSearch({
    search: search || undefined,
    status: status || undefined,
    page,
    size: PAGE_SIZE,
  });
  const units = data?.items ?? [];
  const meta = data?.meta;

  return (
    <div>
      <div className="mb-4">
        <h3 className="text-base font-bold">Zəmanət axtarışı</h3>
        <p className="text-sm text-muted-foreground">
          Seriya nömrəsi, məhsul adı/SKU və ya status üzrə bütün fərdi vahidləri axtarın
        </p>
      </div>

      <WarrantyExpiryBand />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Input
          inputSize="sm"
          wrapperClassName="min-w-[240px] flex-1"
          placeholder="Seriya nömrəsi, məhsul adı, SKU..."
          icon={<Search className="h-4 w-4" />}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
        <select
          className="h-9 rounded-lg border border-line bg-white px-3 text-sm"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as InventoryUnitStatus | '');
            setPage(1);
          }}
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {isError && (
        <Alert variant="danger" title="Yüklənmədi">
          Axtarış nəticələri yüklənə bilmədi.
        </Alert>
      )}
      {isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      )}
      {!isLoading && !isError && units.length === 0 && (
        <Empty
          title="Nəticə tapılmadı"
          description="Axtarış şərtlərinə uyğun heç bir vahid yoxdur."
          icon={<ShieldAlert className="mx-auto h-12 w-12" />}
        />
      )}
      {!isLoading && !isError && units.length > 0 && (
        <ul className="space-y-1.5">
          {units.map((unit) => (
            <li key={unit.id}>
              <button
                type="button"
                onClick={() => setSelectedItemId(unit.itemId)}
                className="flex w-full flex-wrap items-center gap-2 rounded-lg border border-line bg-surface px-3 py-2.5 text-left transition-colors hover:border-graphite"
              >
                <span className="mono font-semibold">{unit.serialNumber}</span>
                <span className="text-sm text-muted-foreground">
                  {unit.itemName} {unit.itemSku && `(${unit.itemSku})`}
                </span>
                <div className="ml-auto flex items-center gap-1.5">
                  <UnitStatusBadge status={unit.status} />
                  <WarrantyStatusBadge status={unit.warrantyStatus} />
                  {unit.warrantyEndDate && (
                    <span className="text-xs text-muted-foreground">
                      {formatDate(unit.warrantyEndDate)}
                    </span>
                  )}
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      {!isLoading && !isError && meta && meta.total_items > 0 && (
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
