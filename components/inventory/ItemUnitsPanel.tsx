'use client';

import { useState } from 'react';
import { AlertTriangle, Plus, QrCode } from 'lucide-react';
import { useInventoryItemUnits, useMarkInventoryItemUnitFailed } from '@/hooks/use-inventory';
import { Button } from '@/components/ui/button';
import { Empty } from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { Label, Field } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { UnitStatusBadge, WarrantyStatusBadge } from '@/components/inventory/badges';
import { formatDate } from '@/lib/utils/format';
import { UnitBatchRegisterDialog } from '@/components/inventory/UnitBatchRegisterDialog';
import { QrCodeDialog } from '@/components/inventory/QrCodeDialog';
import type { InventoryItem, InventoryItemUnit } from '@/types/inventory';

export function ItemUnitsPanel({ item }: { item: InventoryItem }) {
  const { data: units, isLoading, isError } = useInventoryItemUnits(item.id);
  const [batchOpen, setBatchOpen] = useState(false);
  const [failingUnit, setFailingUnit] = useState<InventoryItemUnit | null>(null);
  const [qrUnit, setQrUnit] = useState<InventoryItemUnit | null>(null);

  const inStockCount = units?.filter((u) => u.status === 'IN_STOCK').length ?? 0;

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Stokda: <span className="font-bold text-foreground">{inStockCount}</span> vahid
        </div>
        <Button variant="outline" size="sm" onClick={() => setBatchOpen(true)}>
          <Plus className="h-4 w-4" />
          Partiya qeydiyyatı
        </Button>
      </div>

      {isError && (
        <Alert variant="danger" title="Yüklənmədi">
          Vahid siyahısı yüklənə bilmədi.
        </Alert>
      )}
      {isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      )}
      {!isLoading && !isError && units && units.length === 0 && (
        <Empty title="Hələ vahid qeydə alınmayıb" description="Partiya qeydiyyatı ilə seriya nömrələrini əlavə edin." />
      )}
      {!isLoading && !isError && units && units.length > 0 && (
        <ul className="space-y-1.5">
          {units.map((unit) => (
            <li
              key={unit.id}
              className="flex flex-wrap items-center gap-2 rounded-lg border border-line bg-surface px-3 py-2"
            >
              <span className="mono font-semibold">{unit.serialNumber}</span>
              <UnitStatusBadge status={unit.status} />
              <WarrantyStatusBadge status={unit.warrantyStatus} />
              {unit.warrantyEndDate && (
                <span className="text-xs text-muted-foreground">
                  zəmanət bitmə: {formatDate(unit.warrantyEndDate)}
                </span>
              )}
              <div className="ml-auto flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setQrUnit(unit)}
                  className="btn btn-ghost btn-icon"
                  aria-label="QR kod"
                >
                  <QrCode className="h-4 w-4" />
                </button>
                {(unit.status === 'IN_STOCK' || unit.status === 'IN_USE') && (
                  <Button variant="danger" size="xs" onClick={() => setFailingUnit(unit)}>
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Sıradan çıxdı
                  </Button>
                )}
              </div>
              {unit.status === 'FAILED' && unit.failureNotes && (
                <p className="w-full text-xs text-danger">{unit.failureNotes}</p>
              )}
            </li>
          ))}
        </ul>
      )}

      <UnitBatchRegisterDialog open={batchOpen} onOpenChange={setBatchOpen} item={item} />
      <MarkFailedDialog unit={failingUnit} onClose={() => setFailingUnit(null)} />
      {qrUnit && (
        <QrCodeDialog
          open={Boolean(qrUnit)}
          onOpenChange={(open) => !open && setQrUnit(null)}
          title={qrUnit.serialNumber}
          value={qrUnit.qrCode}
        />
      )}
    </div>
  );
}

function MarkFailedDialog({ unit, onClose }: { unit: InventoryItemUnit | null; onClose: () => void }) {
  const [notes, setNotes] = useState('');
  const markFailed = useMarkInventoryItemUnitFailed();

  if (!unit) return null;

  async function handleConfirm() {
    await markFailed.mutateAsync({ id: unit!.id, failureNotes: notes || undefined });
    setNotes('');
    onClose();
  }

  return (
    <Dialog open={Boolean(unit)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Sıradan çıxma qeydi</DialogTitle>
          <DialogDescription>
            {unit.serialNumber} —{' '}
            {unit.warrantyStatus === 'ACTIVE' ? 'hazırda zəmanət müddətindədir' : 'zəmanət bitib/yoxdur'}
          </DialogDescription>
        </DialogHeader>
        <Field>
          <Label>Qeyd</Label>
          <Textarea
            placeholder="Nasazlığın qısa təsviri..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </Field>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Ləğv et
          </Button>
          <Button variant="danger" loading={markFailed.isPending} onClick={handleConfirm}>
            Sıradan çıxdı kimi qeyd et
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
