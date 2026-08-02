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
import { Label, Field } from '@/components/ui/label';
import { Alert } from '@/components/ui/alert';
import { useStockOperation } from '@/hooks/use-inventory';
import { ApiRequestError } from '@/lib/api/client';
import type { InventoryItem } from '@/types/inventory';

const COPY: Record<'in' | 'out' | 'adjust', { title: string; label: string; hint?: string }> = {
  in: { title: 'Stok girişi', label: 'Əlavə olunacaq miqdar' },
  out: { title: 'Stok çıxışı', label: 'Çıxarılacaq miqdar' },
  adjust: { title: 'Sayım düzəlişi', label: 'Yeni (faktiki) miqdar', hint: 'Cari miqdarı deyil, faktiki sayılan ümumi miqdarı yazın.' },
};

export interface StockOperationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kind: 'in' | 'out' | 'adjust';
  item: InventoryItem | null;
}

export function StockOperationDialog({ open, onOpenChange, kind, item }: StockOperationDialogProps) {
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const mutation = useStockOperation(kind);
  const copy = COPY[kind];

  useEffect(() => {
    if (open) {
      setQuantity('');
      setReason('');
      setError(null);
    }
  }, [open]);

  if (!item) return null;

  async function handleSubmit() {
    setError(null);
    const value = Number(quantity);
    if (!Number.isFinite(value) || value < 0) {
      setError('Düzgün miqdar daxil edin.');
      return;
    }
    try {
      await mutation.mutateAsync({ id: item!.id, body: { quantity: value, reason: reason || undefined } });
      onOpenChange(false);
    } catch (err) {
      setError(
        err instanceof ApiRequestError && err.code === 'STOCK_INSUFFICIENT'
          ? 'Kifayət qədər stok yoxdur.'
          : 'Əməliyyat alınmadı.',
      );
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{copy.title}</DialogTitle>
          <DialogDescription>
            {item.name} — cari miqdar: {item.quantity} {item.unit}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="mb-3">
            <Alert variant="danger" title="Xəta">
              {error}
            </Alert>
          </div>
        )}

        <Field>
          <Label required>{copy.label}</Label>
          <Input
            type="number"
            step="0.001"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            autoFocus
          />
        </Field>
        {kind === 'adjust' && (
          <Field>
            <Label>Səbəb</Label>
            <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Sayım fərqi ..." />
          </Field>
        )}

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Ləğv et
          </Button>
          <Button type="button" variant="primary" loading={mutation.isPending} onClick={handleSubmit}>
            Təsdiqlə
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
