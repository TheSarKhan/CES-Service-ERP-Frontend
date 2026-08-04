'use client';

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Alert } from '@/components/ui/alert';
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
 * "Məhsulu başqa yerə köçür" — moves everything held at one folder to another.
 *
 * The source is a choice now, not a given: a product may sit in several folders, and moving "it"
 * without saying which stock would be a guess at somebody's inventory.
 */
export function MoveItemDialog({ open, onOpenChange, item, contextNodeId }: MoveItemDialogProps) {
  const [fromNodeId, setFromNodeId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [approvalSent, setApprovalSent] = useState(false);
  const moveItem = useMoveInventoryItem();

  useEffect(() => {
    if (!open || !item) return;
    setError(null);
    setFromNodeId(defaultLocation(item, contextNodeId)?.nodeId ?? '');
  }, [open, item, contextNodeId]);

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
    try {
      // Deferred: the move is parked for approval rather than applied.
      await moveItem.mutateAsync({ id: item!.id, fromNodeId, toNodeId: node.id });
      onOpenChange(false);
      setApprovalSent(true);
    } catch (err) {
      setError(
        err instanceof ApiRequestError && err.code === 'ENTITY_PENDING_APPROVAL'
          ? 'Bu məhsulun təsdiq gözləyən dəyişikliyi var — əvvəlcə o qərara alınmalıdır.'
          : 'Köçürmə alınmadı.',
      );
    }
  }

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{item.name} — köçür</DialogTitle>
          <DialogDescription>
            Mənbəni seçin, sonra hədəf qovluğun adına klikləyin
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
          <FieldHint>Bu qovluqdakı bütün qalıq köçürüləcək.</FieldHint>
        </Field>

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
