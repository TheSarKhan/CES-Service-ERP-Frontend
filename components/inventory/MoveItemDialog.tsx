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
import type { InventoryItem, InventoryNode } from '@/types/inventory';

export interface MoveItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: InventoryItem | null;
}

/** "Məhsulu başqa yerə köçür" — browse the Layer tree and drop the item on any node. */
export function MoveItemDialog({ open, onOpenChange, item }: MoveItemDialogProps) {
  const [error, setError] = useState<string | null>(null);
  const moveItem = useMoveInventoryItem();

  if (!item) return null;

  async function handlePick(node: InventoryNode) {
    setError(null);
    try {
      await moveItem.mutateAsync({ id: item!.id, nodeId: node.id });
      onOpenChange(false);
    } catch {
      setError('Köçürmə alınmadı.');
    }
  }

  return (
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
  );
}
