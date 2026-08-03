'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Alert } from '@/components/ui/alert';
import { NodeTree } from '@/components/inventory/NodeTree';
import { useMoveInventoryItem } from '@/hooks/use-inventory';
import { ApiRequestError } from '@/lib/api/client';
import { ApprovalSubmittedDialog } from '@/components/approval/ApprovalSubmittedDialog';
import type { InventoryItem, InventoryNode } from '@/types/inventory';

export interface MoveItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: InventoryItem | null;
}

/** "Məhsulu başqa yerə köçür" — browse the Layer tree and drop the item on any node. */
export function MoveItemDialog({ open, onOpenChange, item }: MoveItemDialogProps) {
  const [error, setError] = useState<string | null>(null);
  const [approvalSent, setApprovalSent] = useState(false);
  const moveItem = useMoveInventoryItem();

  if (!item) return null;

  async function handlePick(node: InventoryNode) {
    setError(null);
    try {
      // Deferred: the move is parked for approval rather than applied.
      await moveItem.mutateAsync({ id: item!.id, nodeId: node.id });
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
            Hədəf node-u seçin (adına klikləyin, ya da &quot;seç&quot; düyməsini basın)
          </DialogDescription>
        </DialogHeader>
        {error && (
          <div className="mb-3">
            <Alert variant="danger" title="Xəta">
              {error}
            </Alert>
          </div>
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
