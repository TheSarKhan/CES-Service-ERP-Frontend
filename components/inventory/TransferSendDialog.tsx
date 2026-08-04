'use client';

import { useEffect, useState } from 'react';
import { ChevronRight, Send } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label, Field, FieldHint } from '@/components/ui/label';
import { Alert } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { NodeTree } from '@/components/inventory/NodeTree';
import { StepChip } from '@/components/roles/StepChip';
import { useInventoryItems, useSendTransfer } from '@/hooks/use-inventory';
import { ApiRequestError } from '@/lib/api/client';
import { quantityAt } from '@/lib/utils/stock';
import { cn } from '@/lib/utils';
import type { InventoryNode } from '@/types/inventory';

/**
 * "Yeni transfer" — source folder, then what leaves it, then where it goes.
 *
 * Three steps rather than one form because each answer narrows the next: the products offered are
 * the ones actually on the source shelf, and their quantities are capped at what is there. A single
 * form would let someone send stock that does not exist and only find out on submit.
 */
export function TransferSendDialog({
  open,
  onOpenChange,
  onSent,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSent?: () => void;
}) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [fromNode, setFromNode] = useState<InventoryNode | null>(null);
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const sendTransfer = useSendTransfer();

  const { data: itemPage, isLoading: itemsLoading } = useInventoryItems(
    { nodeId: fromNode?.id, size: 100 },
    Boolean(fromNode),
  );
  const items = itemPage?.items ?? [];

  useEffect(() => {
    if (!open) return;
    setStep(1);
    setFromNode(null);
    setQuantities({});
    setNotes('');
    setError(null);
  }, [open]);

  const chosen = Object.entries(quantities)
    .map(([itemId, raw]) => ({ itemId, quantity: Number(raw) }))
    .filter((line) => Number.isFinite(line.quantity) && line.quantity > 0);

  async function handleSend(toNode: InventoryNode) {
    setError(null);
    if (!fromNode) return;
    if (toNode.id === fromNode.id) {
      setError('Mənbə və təyinat eyni ola bilməz.');
      return;
    }
    try {
      await sendTransfer.mutateAsync({
        fromNodeId: fromNode.id,
        toNodeId: toNode.id,
        lines: chosen,
        notes: notes || null,
      });
      onSent?.();
      onOpenChange(false);
    } catch (err) {
      setError(
        err instanceof ApiRequestError && err.code === 'STOCK_INSUFFICIENT'
          ? 'Mənbə qovluqda kifayət qədər qalıq yoxdur.'
          : err instanceof ApiRequestError && err.code === 'NODE_CATEGORY_NOT_ALLOWED'
            ? 'Təyinat qovluğu bu kateqoriyadan məhsul qəbul etmir.'
            : 'Transfer göndərilmədi.',
      );
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Yeni transfer</DialogTitle>
          <DialogDescription>
            {step === 1
              ? 'Malın hansı qovluqdan çıxdığını seçin'
              : step === 2
                ? `${fromNode?.name} — nə göndərilir?`
                : 'Təyinat qovluğunu seçin'}
          </DialogDescription>
        </DialogHeader>

        <div className="mb-4 flex items-center gap-3">
          <StepChip n={1} label="Mənbə" state={step === 1 ? 'on' : 'done'} />
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
          <StepChip n={2} label="Məhsullar" state={step === 2 ? 'on' : step > 2 ? 'done' : 'todo'} />
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
          <StepChip n={3} label="Təyinat" state={step === 3 ? 'on' : 'todo'} />
        </div>

        {error && (
          <div className="mb-3">
            <Alert variant="danger" title="Xəta">
              {error}
            </Alert>
          </div>
        )}

        {step === 1 && (
          <div className="max-h-[380px] overflow-y-auto rounded-lg border border-line p-2">
            <NodeTree
              mode="browse"
              onRowClick={(node) => {
                setFromNode(node);
                setQuantities({});
                setStep(2);
              }}
            />
          </div>
        )}

        {step === 2 && (
          <>
            {itemsLoading && <Skeleton className="h-40 w-full" />}
            {!itemsLoading && items.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Bu qovluqda məhsul yoxdur — başqa mənbə seçin.
              </p>
            )}
            {!itemsLoading && items.length > 0 && (
              <div className="max-h-[300px] space-y-1.5 overflow-y-auto">
                {items.map((item) => {
                  const available = quantityAt(item, fromNode?.id);
                  const value = quantities[item.id] ?? '';
                  const tooMuch = value !== '' && Number(value) > available;
                  return (
                    <div
                      key={item.id}
                      className={cn(
                        'flex items-center gap-3 rounded-lg border border-line px-3 py-2',
                        value !== '' && !tooMuch && 'border-gold bg-gold-50',
                      )}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-semibold">{item.name}</div>
                        <div className="mono text-xs text-muted-foreground">
                          bu qovluqda: {available} {item.unit}
                        </div>
                      </div>
                      <Input
                        inputSize="sm"
                        type="number"
                        step="0.001"
                        min="0"
                        max={available}
                        wrapperClassName="w-[120px]"
                        placeholder="0"
                        error={tooMuch}
                        value={value}
                        onChange={(e) =>
                          setQuantities((prev) => ({ ...prev, [item.id]: e.target.value }))
                        }
                      />
                    </div>
                  );
                })}
              </div>
            )}

            <Field className="mt-4">
              <Label htmlFor="transfer-notes">Qeyd</Label>
              <Textarea
                id="transfer-notes"
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
              <FieldHint>Miqdar mənbədən dərhal çıxır, təyinata qəbul ediləndə əlavə olunur.</FieldHint>
            </Field>

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setStep(1)}>
                Geri
              </Button>
              <Button
                type="button"
                variant="primary"
                disabled={chosen.length === 0}
                onClick={() => setStep(3)}
              >
                Davam ({chosen.length})
                <ChevronRight className="h-4 w-4" />
              </Button>
            </DialogFooter>
          </>
        )}

        {step === 3 && (
          <>
            <div className="mb-3 rounded-lg border border-line p-3 text-sm">
              <span className="text-xs text-muted-foreground">Mənbə: </span>
              <span className="font-semibold">{fromNode?.name}</span>
              <span className="ml-2 text-xs text-muted-foreground">
                · {chosen.length} məhsul
              </span>
            </div>
            <div className="max-h-[320px] overflow-y-auto rounded-lg border border-line p-2">
              <NodeTree mode="browse" onRowClick={handleSend} />
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setStep(2)}>
                Geri
              </Button>
              {sendTransfer.isPending && (
                <Button type="button" variant="primary" loading>
                  <Send className="h-4 w-4" />
                  Göndərilir
                </Button>
              )}
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
