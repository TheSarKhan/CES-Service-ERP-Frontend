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
import type { InventoryItem, InventoryNode } from '@/types/inventory';

export interface MoveItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: InventoryItem | null;
}

/** "Məhsulu başqa yerə köçür" — browse the Layer tree and drop the item on a leaf node. */
export function MoveItemDialog({ open, onOpenChange, item }: MoveItemDialogProps) {
  const [error, setError] = useState<string | null>(null);
  const moveItem = useMoveInventoryItem();

  if (!item) return null;

  async function handlePick(node: InventoryNode) {
    setError(null);
    try {
      await moveItem.mutateAsync({ id: item!.id, nodeId: node.id });
      onOpenChange(false);
    } catch (err) {
      setError(
        err instanceof ApiRequestError && err.code === 'NODE_NOT_LEAF'
          ? 'Bu node leaf deyil — yalnız alt node-u olmayan node-lara köçürmək olar.'
          : 'Köçürmə alınmadı.',
      );
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{item.name} — köçür</DialogTitle>
          <DialogDescription>Hədəf leaf node üzərinə klikləyin</DialogDescription>
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
  );
}
