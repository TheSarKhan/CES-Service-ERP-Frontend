'use client';

import { useEffect, useState } from 'react';
import { Boxes, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Empty } from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert } from '@/components/ui/alert';
import { Label, Field, FieldHint } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Badge } from '@/components/ui/badge';
import { WarrantyStatusBadge } from '@/components/inventory/badges';
import { useItemLots, useReceiveLot, useWriteOffLot } from '@/hooks/use-inventory';
import { defaultLocation } from '@/lib/utils/stock';
import { formatDate } from '@/lib/utils/format';
import { cn } from '@/lib/utils';
import type { InventoryItem, InventoryLot } from '@/types/inventory';

/**
 * Batches of one product, soonest expiry first.
 *
 * The order *is* the FEFO suggestion: the top row is the one to pick. It is a suggestion rather
 * than a rule because a warehouse has real reasons to take another batch — a damaged pallet at the
 * front, a customer returning a specific lot — and refusing those would only teach people to record
 * the wrong one.
 */
export function ItemLotsPanel({
  item,
  contextNodeId,
}: {
  item: InventoryItem;
  contextNodeId?: string | null;
}) {
  const { data: lots, isLoading } = useItemLots(item.id);
  const receiveLot = useReceiveLot();
  const writeOff = useWriteOffLot();

  const [formOpen, setFormOpen] = useState(false);
  const [removing, setRemoving] = useState<InventoryLot | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [nodeId, setNodeId] = useState('');
  const [lotNumber, setLotNumber] = useState('');
  const [quantity, setQuantity] = useState('');
  const [expiryDate, setExpiryDate] = useState('');

  useEffect(() => {
    if (!formOpen) return;
    setNodeId(defaultLocation(item, contextNodeId)?.nodeId ?? item.locations[0]?.nodeId ?? '');
    setLotNumber('');
    setQuantity('');
    setExpiryDate('');
    setError(null);
  }, [formOpen, item, contextNodeId]);

  async function handleReceive() {
    setError(null);
    const value = Number(quantity);
    if (!nodeId) return setError('Qovluq seçin.');
    if (!lotNumber.trim()) return setError('Partiya nömrəsi yazın.');
    if (!Number.isFinite(value) || value <= 0) return setError('Düzgün miqdar daxil edin.');
    try {
      await receiveLot.mutateAsync({
        itemId: item.id,
        body: {
          nodeId,
          lotNumber: lotNumber.trim(),
          quantity: value,
          expiryDate: expiryDate || null,
        },
      });
      setFormOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Partiya qeydə alınmadı.');
    }
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Cəmi: <span className="font-bold text-foreground">{item.totalQuantity}</span> {item.unit}
        </div>
        <Button variant="outline" size="sm" onClick={() => setFormOpen(true)}>
          <Plus className="h-4 w-4" />
          Partiya qəbul et
        </Button>
      </div>

      {isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      )}

      {!isLoading && lots && lots.length === 0 && (
        <Empty
          title="Partiya yoxdur"
          description="«Partiya qəbul et» ilə ilk partiyanı qeyd edin."
          icon={<Boxes className="mx-auto h-12 w-12" />}
        />
      )}

      {!isLoading && lots && lots.length > 0 && (
        <ul className="space-y-1.5">
          {lots.map((lot, index) => (
            <li
              key={lot.id}
              className={cn(
                'flex flex-wrap items-center gap-2 rounded-lg border border-line px-3 py-2.5',
                // The first row is what FEFO would pick — marked rather than merely first, so it
                // still reads as the answer when the list is long.
                index === 0 && 'border-gold bg-gold-50',
              )}
            >
              <span className="mono font-semibold">{lot.lotNumber}</span>
              {index === 0 && (
                <Badge variant="gold" size="sm">
                  Əvvəlcə bunu işlət
                </Badge>
              )}
              <span className="mono text-sm">
                {lot.quantity} {item.unit}
              </span>
              <span className="text-xs text-muted-foreground">{lot.nodeName}</span>
              <div className="ml-auto flex items-center gap-2">
                {lot.expiryDate ? (
                  <>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(lot.expiryDate)}
                    </span>
                    <WarrantyStatusBadge status={lot.expiryStatus} />
                  </>
                ) : (
                  <span className="text-xs text-muted-foreground">tarixsiz</span>
                )}
                <button
                  type="button"
                  onClick={() => setRemoving(lot)}
                  className="btn btn-ghost btn-icon"
                  aria-label="Partiyanı sil"
                  title="Sil (qalıq çıxılır)"
                >
                  <Trash2 className="h-4 w-4 text-danger" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Partiya qəbul et</DialogTitle>
            <DialogDescription>{item.name}</DialogDescription>
          </DialogHeader>

          {error && (
            <div className="mb-3">
              <Alert variant="danger" title="Xəta">
                {error}
              </Alert>
            </div>
          )}

          <Field>
            <Label required>Qovluq</Label>
            <select
              className="h-10 w-full rounded-[11px] border border-line bg-white px-3 text-sm"
              value={nodeId}
              onChange={(e) => setNodeId(e.target.value)}
            >
              <option value="">Seçin...</option>
              {item.locations.map((location) => (
                <option key={location.nodeId} value={location.nodeId}>
                  {location.nodeName ?? 'Qovluq'}
                </option>
              ))}
            </select>
          </Field>

          <Field>
            <Label htmlFor="lot-number" required>
              Partiya nömrəsi
            </Label>
            <Input
              id="lot-number"
              value={lotNumber}
              onChange={(e) => setLotNumber(e.target.value)}
              placeholder="LOT-2401"
            />
            <FieldHint>Eyni nömrə yenidən yazılsa, mövcud partiyaya əlavə olunur.</FieldHint>
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field className="mb-0">
              <Label htmlFor="lot-qty" required>
                Miqdar
              </Label>
              <Input
                id="lot-qty"
                type="number"
                step="0.001"
                min="0"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </Field>
            <Field className="mb-0">
              <Label htmlFor="lot-expiry">Son istifadə tarixi</Label>
              <Input
                id="lot-expiry"
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
              />
            </Field>
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setFormOpen(false)}>
              Ləğv et
            </Button>
            <Button
              type="button"
              variant="primary"
              loading={receiveLot.isPending}
              onClick={handleReceive}
            >
              Qəbul et
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(removing)}
        onOpenChange={(open) => !open && setRemoving(null)}
        title="Partiyanı sil"
        description={`«${removing?.lotNumber ?? ''}» partiyasının qalan ${removing?.quantity ?? 0} ${item.unit} stokdan çıxarılacaq.`}
        confirmLabel="Sil"
        loading={writeOff.isPending}
        onConfirm={async () => {
          if (!removing) return;
          await writeOff.mutateAsync({ lotId: removing.id, reason: 'Partiya silindi' });
          setRemoving(null);
        }}
      />
    </div>
  );
}
