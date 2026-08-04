'use client';

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label, Field, FieldHint } from '@/components/ui/label';
import { Alert } from '@/components/ui/alert';
import { NodeTree } from '@/components/inventory/NodeTree';
import { useStockOperation } from '@/hooks/use-inventory';
import { ApiRequestError } from '@/lib/api/client';
import { defaultLocation, quantityAt } from '@/lib/utils/stock';
import type { InventoryItem, InventoryNode } from '@/types/inventory';

const COPY: Record<'in' | 'out' | 'adjust', { title: string; label: string; hint?: string }> = {
  in: { title: 'Stok girişi', label: 'Əlavə olunacaq miqdar' },
  out: { title: 'Stok çıxışı', label: 'Çıxarılacaq miqdar' },
  adjust: {
    title: 'Sayım düzəlişi',
    label: 'Yeni (faktiki) miqdar',
    hint: 'Cari miqdarı deyil, bu qovluqda faktiki sayılan miqdarı yazın.',
  },
};

export interface StockOperationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kind: 'in' | 'out' | 'adjust';
  item: InventoryItem | null;
  /** Folder the user came from; preselected so the common path needs no choice at all. */
  contextNodeId?: string | null;
  /**
   * Fired once the request is parked. The confirmation belongs to the caller: this dialog is
   * usually rendered conditionally, so closing it unmounts the component — and a confirmation
   * owned here would disappear in the same tick, leaving the submission with no feedback at all.
   */
  onSubmitted?: (title: string) => void;
}

/**
 * Stock in / out / count correction, always against one folder.
 *
 * A product can be held in several places, so "add 50" has no meaning until the shelf is named.
 * When the user came from a folder that answer is already known; otherwise they pick.
 */
export function StockOperationDialog({
  open,
  onOpenChange,
  kind,
  item,
  contextNodeId,
  onSubmitted,
}: StockOperationDialogProps) {
  const [nodeId, setNodeId] = useState<string>('');
  const [browsing, setBrowsing] = useState(false);
  const [browsedNode, setBrowsedNode] = useState<InventoryNode | null>(null);
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const mutation = useStockOperation(kind);
  const copy = COPY[kind];

  useEffect(() => {
    if (!open || !item) return;
    setQuantity('');
    setReason('');
    setError(null);
    setBrowsing(false);
    setBrowsedNode(null);
    setNodeId(defaultLocation(item, contextNodeId)?.nodeId ?? '');
  }, [open, item, contextNodeId]);

  if (!item) return null;

  const targetNodeId = browsedNode?.id ?? nodeId;
  const currentQuantity = quantityAt(item, targetNodeId);
  const targetName =
    browsedNode?.name ?? item.locations.find((l) => l.nodeId === nodeId)?.nodeName ?? null;

  async function handleSubmit() {
    setError(null);
    if (!targetNodeId) {
      setError('Qovluq seçin.');
      return;
    }
    const value = Number(quantity);
    if (!Number.isFinite(value) || value < 0) {
      setError('Düzgün miqdar daxil edin.');
      return;
    }
    try {
      // Deferred: stock movements are reviewed too, so nothing changes until approval.
      await mutation.mutateAsync({
        id: item!.id,
        body: { nodeId: targetNodeId, quantity: value, reason: reason || undefined },
      });
      onOpenChange(false);
      onSubmitted?.(copy.title);
    } catch (err) {
      setError(
        err instanceof ApiRequestError && err.code === 'STOCK_INSUFFICIENT'
          ? 'Bu qovluqda kifayət qədər stok yoxdur.'
          : err instanceof ApiRequestError && err.code === 'ENTITY_PENDING_APPROVAL'
            ? 'Bu məhsulun təsdiq gözləyən dəyişikliyi var — əvvəlcə o qərara alınmalıdır.'
            : err instanceof ApiRequestError && err.code === 'NODE_CATEGORY_NOT_ALLOWED'
              ? 'Bu qovluq bu kateqoriyadan məhsul qəbul etmir.'
              : 'Əməliyyat alınmadı.',
      );
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className={browsing ? 'max-w-lg' : 'max-w-sm'}>
          <DialogHeader>
            <DialogTitle>{copy.title}</DialogTitle>
            <DialogDescription>
              {item.name} — cəmi {item.totalQuantity} {item.unit}
            </DialogDescription>
          </DialogHeader>

          {error && (
            <div className="mb-3">
              <Alert variant="danger" title="Xəta">
                {error}
              </Alert>
            </div>
          )}

          {browsing ? (
            <>
              <Field>
                <Label required>Qovluq seçin</Label>
                <div className="max-h-[320px] overflow-y-auto rounded-lg border border-line p-2">
                  <NodeTree
                    mode="browse"
                    onRowClick={(node) => {
                      setBrowsedNode(node);
                      setBrowsing(false);
                    }}
                  />
                </div>
              </Field>
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setBrowsing(false)}>
                  Geri
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <Field>
                <Label required>Qovluq</Label>
                {browsedNode ? (
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{browsedNode.name}</span>
                    <Button variant="ghost" size="xs" onClick={() => setBrowsedNode(null)}>
                      Dəyiş
                    </Button>
                  </div>
                ) : (
                  <select
                    className="h-10 w-full rounded-[11px] border border-line bg-white px-3 text-sm"
                    value={nodeId}
                    onChange={(e) => setNodeId(e.target.value)}
                  >
                    <option value="">Seçin...</option>
                    {item.locations.map((location) => (
                      <option key={location.nodeId} value={location.nodeId}>
                        {location.nodeName ?? 'Qovluq'} ({location.quantity} {item.unit})
                      </option>
                    ))}
                  </select>
                )}
                {/* Incoming goods routinely land on a shelf the product has never been kept on. */}
                {kind === 'in' && !browsedNode && (
                  <Button
                    variant="ghost"
                    size="xs"
                    className="mt-1"
                    onClick={() => setBrowsing(true)}
                  >
                    Başqa qovluğa gətir
                  </Button>
                )}
                {targetNodeId && (
                  <FieldHint>
                    {targetName ?? 'Bu qovluq'} — hazırkı qalıq: {currentQuantity} {item.unit}
                  </FieldHint>
                )}
              </Field>

              <Field>
                <Label required>{copy.label}</Label>
                <Input
                  type="number"
                  step="0.001"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  autoFocus
                />
                {copy.hint && <FieldHint>{copy.hint}</FieldHint>}
              </Field>

              {kind === 'adjust' && (
                <Field>
                  <Label>Səbəb</Label>
                  <Input
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Sayım fərqi ..."
                  />
                </Field>
              )}

              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                  Ləğv et
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  loading={mutation.isPending}
                  onClick={handleSubmit}
                >
                  Təsdiqlə
                </Button>
              </DialogFooter>
            </>
          )}
      </DialogContent>
    </Dialog>
  );
}
