'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import { useInventoryItem, useInventoryItemUnit, useInventoryNodePath } from '@/hooks/use-inventory';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { TableWrap } from '@/components/ui/table';
import { ScanLocation } from '@/components/inventory/scan/ScanLocation';
import { ItemDetailDialog } from '@/components/inventory/ItemDetailDialog';
import { UnitStatusBadge, WarrantyStatusBadge } from '@/components/inventory/badges';
import { formatDate } from '@/lib/utils/format';

/**
 * What a scanned serial-number label shows. A unit is the level warranty actually lives at, so
 * its dates lead here rather than the parent product's.
 */
export function ScanUnitView({ unitId }: { unitId: string }) {
  const router = useRouter();
  const { data: unit, isLoading } = useInventoryItemUnit(unitId);
  const { data: item } = useInventoryItem(unit?.itemId ?? null);
  const { data: path } = useInventoryNodePath(unit?.nodeId ?? null, Boolean(unit));
  const [detailOpen, setDetailOpen] = useState(false);

  if (isLoading || !unit) {
    return (
      <TableWrap className="p-4">
        <Skeleton className="h-24 w-full" />
      </TableWrap>
    );
  }

  return (
    <div className="space-y-4">
      <TableWrap className="p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="mono text-lg font-bold">{unit.serialNumber}</div>
            <div className="text-xs text-muted-foreground">
              {unit.itemName ?? item?.name ?? '—'}
              {unit.itemSku ? ` · ${unit.itemSku}` : ''}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <UnitStatusBadge status={unit.status} />
              <WarrantyStatusBadge status={unit.warrantyStatus} />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => setDetailOpen(true)}>
              Məhsulun detalı
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => router.push(`/warehouse?nodeId=${unit.nodeId}`)}
            >
              Anbarda aç
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 border-t border-line pt-3 md:grid-cols-4">
          <div>
            <div className="text-xs text-muted-foreground">Alınma tarixi</div>
            <div className="mt-0.5 text-sm font-semibold">{formatDate(unit.purchaseDate)}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Zəmanət başlanğıcı</div>
            <div className="mt-0.5 text-sm font-semibold">{formatDate(unit.warrantyStartDate)}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Zəmanət bitmə</div>
            <div className="mt-0.5 flex items-center gap-1.5 text-sm font-semibold">
              <ShieldCheck className="h-3.5 w-3.5 text-muted-foreground" />
              {formatDate(unit.warrantyEndDate)}
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Sıradan çıxma</div>
            <div className="mt-0.5 text-sm font-semibold">{formatDate(unit.failedAt)}</div>
          </div>
        </div>

        {unit.failureNotes && (
          <div className="mt-3 border-t border-line pt-3">
            <div className="text-xs text-muted-foreground">Nasazlıq qeydi</div>
            <div className="mt-0.5 whitespace-pre-wrap text-sm">{unit.failureNotes}</div>
          </div>
        )}

        <div className="mt-4 border-t border-line pt-3">
          <ScanLocation path={path} />
        </div>
      </TableWrap>

      <ItemDetailDialog open={detailOpen} onOpenChange={setDetailOpen} itemId={unit.itemId} />
    </div>
  );
}
