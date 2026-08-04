'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label, Field, FieldHint } from '@/components/ui/label';
import { NodeTree } from '@/components/inventory/NodeTree';
import { useMoveInventoryItem } from '@/hooks/use-inventory';
import { ApiRequestError } from '@/lib/api/client';
import { ApprovalSubmittedDialog } from '@/components/approval/ApprovalSubmittedDialog';
import { defaultLocation } from '@/lib/utils/stock';
import type { InventoryItem, InventoryNode } from '@/types/inventory';

export interface MoveItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: InventoryItem | null;
  /** Folder the user came from — preselected as the source. */
  contextNodeId?: string | null;
}

/**
 * "Məhsulu başqa yerə köçür" — moves stock from one folder to another.
 *
 * The source is a choice, not a given: a product may sit in several folders, and moving "it"
 * without saying which stock would be a guess at somebody's inventory.
 *
 * The amount defaults to the whole balance because that is the ordinary case — the product simply
 * lives somewhere else now. Lowering it splits the balance instead, and the product stays filed in
 * both folders.
 */
export function MoveItemDialog({ open, onOpenChange, item, contextNodeId }: MoveItemDialogProps) {
  const [fromNodeId, setFromNodeId] = useState('');
  const [amount, setAmount] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [approvalSent, setApprovalSent] = useState(false);
  const moveItem = useMoveInventoryItem();

  const available = useMemo(
    () => item?.locations.find((l) => l.nodeId === fromNodeId)?.quantity ?? 0,
    [item, fromNodeId],
  );

  // A serialized product's balance is recomputed from its units, so an amount here would not
  // survive; there the whole placement moves and the units follow.
  const canSplit = Boolean(item && !item.isSerialized && available > 0);

  useEffect(() => {
    if (!open || !item) return;
    setError(null);
    setFromNodeId(defaultLocation(item, contextNodeId)?.nodeId ?? '');
  }, [open, item, contextNodeId]);

  // Changing the source changes what "all of it" means, so the amount follows it.
  useEffect(() => {
    setAmount(available > 0 ? String(available) : '');
    setError(null);
  }, [available]);

  if (!item) return null;

  async function handlePick(node: InventoryNode) {
    setError(null);
    if (!fromNodeId) {
      setError('Əvvəlcə mənbə qovluğunu seçin.');
      return;
    }
    if (node.id === fromNodeId) {
      setError('Mənbə və təyinat eyni ola bilməz.');
      return;
    }

    let quantity: number | undefined;
    if (canSplit) {
      const parsed = Number(amount.replace(',', '.'));
      if (!Number.isFinite(parsed) || parsed <= 0) {
        setError('Miqdar sıfırdan böyük olmalıdır.');
        return;
      }
      if (parsed > available) {
        setError(`Bu qovluqda yalnız ${available} ${item!.unit} var.`);
        return;
      }
      quantity = parsed;
    }

    try {
      // Deferred: the move is parked for approval rather than applied.
      await moveItem.mutateAsync({ id: item!.id, fromNodeId, toNodeId: node.id, quantity });
      onOpenChange(false);
      setApprovalSent(true);
    } catch (err) {
      if (err instanceof ApiRequestError && err.code === 'ENTITY_PENDING_APPROVAL') {
        setError('Bu məhsulun təsdiq gözləyən dəyişikliyi var — əvvəlcə o qərara alınmalıdır.');
      } else if (err instanceof ApiRequestError && err.code === 'STOCK_INSUFFICIENT') {
        setError('Mənbə qovluqda bu qədər qalıq yoxdur.');
      } else {
        setError('Köçürmə alınmadı.');
      }
    }
  }

  const movingAll = canSplit && Number(amount.replace(',', '.')) >= available;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{item.name} — köçür</DialogTitle>
            <DialogDescription>
              Mənbəni və miqdarı seçin, sonra hədəf qovluğun adına klikləyin
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
            <Label required>Mənbə qovluq</Label>
            <select
              className="h-10 w-full rounded-[11px] border border-line bg-white px-3 text-sm"
              value={fromNodeId}
              onChange={(e) => setFromNodeId(e.target.value)}
            >
              <option value="">Seçin...</option>
              {item.locations.map((location) => (
                <option key={location.nodeId} value={location.nodeId}>
                  {location.nodeName ?? 'Qovluq'} ({location.quantity} {item.unit})
                </option>
              ))}
            </select>
          </Field>

          {canSplit ? (
            <Field>
              <Label required>Köçürüləcək miqdar</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={0}
                  max={available}
                  step="any"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="max-w-[180px]"
                />
                <span className="text-sm text-muted-foreground">{item.unit}</span>
                {/* One click back to the ordinary case, so splitting never costs the common path. */}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setAmount(String(available))}
                  disabled={movingAll}
                >
                  Hamısı ({available})
                </Button>
              </div>
              <FieldHint>
                {movingAll
                  ? 'Bütün qalıq köçürülür — məhsul bu qovluqda qalmayacaq.'
                  : `Qalan ${Math.max(available - Number(amount.replace(',', '.') || 0), 0)} ${item.unit} mənbə qovluqda qalacaq.`}
              </FieldHint>
            </Field>
          ) : (
            <FieldHint className="mb-4 block">
              {/* Order matters: "no stock here" would be a lie while no folder is chosen yet. */}
              {!fromNodeId
                ? 'Miqdarı göstərmək üçün əvvəlcə mənbə qovluğunu seçin.'
                : item.isSerialized
                  ? 'Seriyalı məhsulda miqdar vahidlərdən hesablanır — yerləşmə bütövlükdə köçürülür.'
                  : 'Bu qovluqda qalıq yoxdur — yalnız məhsulun yerləşməsi köçürüləcək.'}
            </FieldHint>
          )}

          <NodeTree mode="browse" onRowClick={handlePick} />
        </DialogContent>
      </Dialog>
      <ApprovalSubmittedDialog
        open={approvalSent}
        onOpenChange={setApprovalSent}
        description="Məhsulun köçürülməsi"
      />
    </>
  );
}
