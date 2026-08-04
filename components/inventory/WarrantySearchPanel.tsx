'use client';

import { useState } from 'react';
import { FileWarning, Search, ShieldAlert, SlidersHorizontal, X } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableTools,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Empty } from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert } from '@/components/ui/alert';
import { Pagination } from '@/components/ui/pagination';
import {
  ClaimStatusBadge,
  RecordTypeBadge,
  UnitStatusBadge,
  WarrantyStatusBadge,
} from '@/components/inventory/badges';
import { ItemDetailDialog } from '@/components/inventory/ItemDetailDialog';
import { WarrantyClaimDialog } from '@/components/inventory/WarrantyClaimDialog';
import { WarrantyClaimDecisionDialog } from '@/components/inventory/WarrantyClaimDecisionDialog';
import { useWarrantyRecords, useWarrantySuppliers } from '@/hooks/use-inventory';
import { formatDate } from '@/lib/utils/format';
import { cn } from '@/lib/utils';
import type {
  InventoryUnitStatus,
  WarrantyClaim,
  WarrantyRecord,
  WarrantyRecordType,
  WarrantyStatus,
} from '@/types/inventory';

const PAGE_SIZE = 20;
const COLUMN_COUNT = 6;

const WARRANTY_STATUS_OPTIONS: { value: WarrantyStatus | ''; label: string }[] = [
  { value: '', label: 'Zəmanət: hamısı' },
  { value: 'ACTIVE', label: 'Qüvvədə' },
  { value: 'EXPIRING_SOON', label: 'Bitmək üzrə' },
  { value: 'EXPIRED', label: 'Bitib' },
  { value: 'NONE', label: 'Zəmanətsiz' },
];

const RECORD_TYPE_OPTIONS: { value: WarrantyRecordType | ''; label: string }[] = [
  { value: '', label: 'Növ: hamısı' },
  { value: 'UNIT', label: 'Seriyalı vahidlər' },
  { value: 'ITEM', label: 'Adi məhsullar' },
];

const UNIT_STATUS_OPTIONS: { value: InventoryUnitStatus | ''; label: string }[] = [
  { value: '', label: 'Vahid statusu: hamısı' },
  { value: 'IN_STOCK', label: 'Stokda' },
  { value: 'IN_USE', label: 'İstifadədə' },
  { value: 'FAILED', label: 'Sıradan çıxıb' },
  { value: 'DISPOSED', label: 'Silinib' },
  { value: 'RETURNED', label: 'Qaytarılıb' },
];

/** Common horizons, so the frequent question doesn't need two date pickers. */
const HORIZON_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'Vaxt: məhdudiyyətsiz' },
  { value: '30', label: 'Növbəti 30 gündə bitir' },
  { value: '90', label: 'Növbəti 90 gündə bitir' },
  { value: '180', label: 'Növbəti 6 ayda bitir' },
  { value: '365', label: 'Növbəti 1 ildə bitir' },
];

const SELECT_CLASS = 'h-9 rounded-lg border border-line bg-white px-2 text-sm';

/** How urgent the remaining time is — turns a date into something scannable. */
function remainingLabel(record: WarrantyRecord): { text: string; className: string } {
  if (record.daysRemaining === null) return { text: '—', className: 'text-muted-foreground' };
  if (record.daysRemaining < 0) {
    return { text: `${Math.abs(record.daysRemaining)} gün keçib`, className: 'text-danger' };
  }
  if (record.daysRemaining <= 30) {
    return { text: `${record.daysRemaining} gün qalıb`, className: 'text-warn' };
  }
  return { text: `${record.daysRemaining} gün qalıb`, className: 'text-muted-foreground' };
}

/**
 * The warranty search — every warranty in the branch, whichever table it lives in.
 *
 * Serialized units and non-serialized products are one list on purpose: the question ("is this
 * still covered, and who pays?") is the same for both, and a screen that only showed units left
 * half the warehouse unanswerable.
 */
export function WarrantySearchPanel({
  warrantyStatus,
  onWarrantyStatusChange,
}: {
  warrantyStatus: WarrantyStatus | '';
  onWarrantyStatusChange: (status: WarrantyStatus | '') => void;
}) {
  const [search, setSearch] = useState('');
  const [recordType, setRecordType] = useState<WarrantyRecordType | ''>('');
  const [unitStatus, setUnitStatus] = useState<InventoryUnitStatus | ''>('');
  const [supplier, setSupplier] = useState('');
  const [withinDays, setWithinDays] = useState('');
  const [endFrom, setEndFrom] = useState('');
  const [endTo, setEndTo] = useState('');
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [page, setPage] = useState(1);

  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [claimTarget, setClaimTarget] = useState<WarrantyRecord | null>(null);
  const [decisionClaim, setDecisionClaim] = useState<WarrantyClaim | null>(null);

  const { data: suppliers } = useWarrantySuppliers();
  const { data, isLoading, isError } = useWarrantyRecords({
    search: search || undefined,
    recordType: recordType || undefined,
    warrantyStatus: warrantyStatus || undefined,
    unitStatus: unitStatus || undefined,
    supplier: supplier || undefined,
    withinDays: withinDays ? Number(withinDays) : undefined,
    endFrom: endFrom || undefined,
    endTo: endTo || undefined,
    page,
    size: PAGE_SIZE,
  });

  const records = data?.items ?? [];
  const meta = data?.meta;
  const filterCount =
    (search ? 1 : 0) +
    (recordType ? 1 : 0) +
    (warrantyStatus ? 1 : 0) +
    (unitStatus ? 1 : 0) +
    (supplier ? 1 : 0) +
    (withinDays ? 1 : 0) +
    (endFrom ? 1 : 0) +
    (endTo ? 1 : 0);

  /** Any filter change invalidates the current page number. */
  function change<T>(setter: (value: T) => void) {
    return (value: T) => {
      setter(value);
      setPage(1);
    };
  }

  function clearFilters() {
    setSearch('');
    setRecordType('');
    onWarrantyStatusChange('');
    setUnitStatus('');
    setSupplier('');
    setWithinDays('');
    setEndFrom('');
    setEndTo('');
    setPage(1);
  }

  return (
    <div>
      <TableTools>
        <div className="tt-left">
          <h3>Zəmanətlər</h3>
          <span className="muted">
            {meta ? `Cəmi ${meta.total_items}` : 'Yüklənir...'}
          </span>
        </div>
        <div className="tt-right flex flex-wrap items-center gap-2">
          <Input
            inputSize="sm"
            wrapperClassName="min-w-[220px]"
            placeholder="Seriya, ad, SKU, barkod, QR..."
            icon={<Search className="h-4 w-4" />}
            value={search}
            onChange={(e) => change(setSearch)(e.target.value)}
          />
          <select
            className={SELECT_CLASS}
            value={warrantyStatus}
            onChange={(e) => {
              onWarrantyStatusChange(e.target.value as WarrantyStatus | '');
              setPage(1);
            }}
          >
            {WARRANTY_STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <select
            className={SELECT_CLASS}
            value={recordType}
            onChange={(e) => change(setRecordType)(e.target.value as WarrantyRecordType | '')}
          >
            {RECORD_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <Button
            variant={advancedOpen ? 'outline' : 'ghost'}
            size="sm"
            onClick={() => setAdvancedOpen((v) => !v)}
          >
            <SlidersHorizontal className="h-4 w-4" />
            Ətraflı filtr
          </Button>
          {filterCount > 0 && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="h-4 w-4" />
              Təmizlə ({filterCount})
            </Button>
          )}
        </div>
      </TableTools>

      {advancedOpen && (
        <div className="mb-3 flex flex-wrap items-end gap-2 rounded-lg border border-line bg-graphite-50 p-3">
          <select
            className={SELECT_CLASS}
            value={supplier}
            onChange={(e) => change(setSupplier)(e.target.value)}
          >
            <option value="">Təchizatçı: hamısı</option>
            {(suppliers ?? []).map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
          <select
            className={SELECT_CLASS}
            value={unitStatus}
            onChange={(e) => change(setUnitStatus)(e.target.value as InventoryUnitStatus | '')}
          >
            {UNIT_STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <select
            className={SELECT_CLASS}
            value={withinDays}
            onChange={(e) => change(setWithinDays)(e.target.value)}
            disabled={Boolean(endFrom || endTo)}
          >
            {HORIZON_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground">Bitmə tarixi</span>
            <Input
              inputSize="sm"
              type="date"
              wrapperClassName="w-[150px]"
              value={endFrom}
              onChange={(e) => change(setEndFrom)(e.target.value)}
            />
            <span className="text-xs text-muted-foreground">—</span>
            <Input
              inputSize="sm"
              type="date"
              wrapperClassName="w-[150px]"
              value={endTo}
              onChange={(e) => change(setEndTo)(e.target.value)}
            />
          </div>
          {/* A unit status only exists on units, so choosing one silently drops product rows. */}
          {unitStatus && recordType === 'ITEM' && (
            <span className="text-xs text-danger">
              Vahid statusu seçilib — adi məhsullar nəticəyə düşməyəcək.
            </span>
          )}
        </div>
      )}

      {isError && (
        <Alert variant="danger" title="Yüklənmədi">
          Axtarış nəticələri yüklənə bilmədi.
        </Alert>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Məhsul / Seriya</TableHead>
            <TableHead>Təchizatçı</TableHead>
            <TableHead>Zəmanət bitir</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Tələb</TableHead>
            <TableHead className="w-act" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading &&
            Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={`sk-${i}`}>
                {Array.from({ length: COLUMN_COUNT }).map((__, c) => (
                  <TableCell key={`sk-${i}-${c}`}>
                    <span className="skel w-70 block" />
                  </TableCell>
                ))}
              </TableRow>
            ))}

          {!isLoading &&
            !isError &&
            records.map((record) => {
              const remaining = remainingLabel(record);
              return (
                <TableRow
                  key={`${record.recordType}-${record.recordId}`}
                  className="cursor-pointer"
                  onClick={() => setSelectedItemId(record.itemId)}
                >
                  <TableCell>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <RecordTypeBadge type={record.recordType} />
                      <b className="font-semibold">
                        {record.serialNumber ?? record.itemName}
                      </b>
                    </div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      {record.serialNumber ? `${record.itemName} · ` : ''}
                      {record.itemSku}
                      {record.quantity !== null ? ` · ${record.quantity} ${record.unit}` : ''}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className={cn(!record.supplier && 'text-muted-foreground')}>
                      {record.supplier || '—'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="font-semibold">{formatDate(record.warrantyEndDate)}</div>
                    <div className={cn('text-xs', remaining.className)}>{remaining.text}</div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <WarrantyStatusBadge status={record.warrantyStatus} />
                      {record.unitStatus && <UnitStatusBadge status={record.unitStatus} />}
                    </div>
                  </TableCell>
                  <TableCell>
                    {record.latestClaim ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDecisionClaim(record.latestClaim);
                        }}
                        title="Nəticəni qeyd et"
                      >
                        <ClaimStatusBadge status={record.latestClaim.status} />
                      </button>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="r">
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        setClaimTarget(record);
                      }}
                    >
                      <FileWarning className="h-3.5 w-3.5" />
                      Tələb aç
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
        </TableBody>
      </Table>

      {!isLoading && !isError && records.length === 0 && (
        <Empty
          title="Nəticə tapılmadı"
          description={
            filterCount > 0
              ? 'Filtrlərə uyğun zəmanət qeydi yoxdur.'
              : 'Hələ zəmanət təyin edilmiş məhsul və ya vahid yoxdur.'
          }
          icon={<ShieldAlert className="mx-auto h-12 w-12" />}
        />
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

      {claimTarget && (
        <WarrantyClaimDialog
          open
          onOpenChange={(open) => !open && setClaimTarget(null)}
          targetType={
            claimTarget.recordType === 'UNIT' ? 'INVENTORY_ITEM_UNIT' : 'INVENTORY_ITEM'
          }
          targetId={claimTarget.recordId}
          targetLabel={claimTarget.serialNumber ?? claimTarget.itemName}
          defaultSupplier={claimTarget.supplier}
        />
      )}

      <WarrantyClaimDecisionDialog
        open={Boolean(decisionClaim)}
        onOpenChange={(open) => !open && setDecisionClaim(null)}
        claim={decisionClaim}
      />
    </div>
  );
}
