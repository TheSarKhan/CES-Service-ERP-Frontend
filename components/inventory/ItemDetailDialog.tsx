'use client';

import { useState } from 'react';
import { ArrowDownCircle, ArrowUpCircle, ListChecks, Move, Pencil, QrCode, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { useDeleteInventoryItem, useInventoryCategories, useInventoryItem } from '@/hooks/use-inventory';
import { ApiRequestError } from '@/lib/api/client';
import { ItemFormDialog } from '@/components/inventory/ItemFormDialog';
import { MoveItemDialog } from '@/components/inventory/MoveItemDialog';
import { StockOperationDialog } from '@/components/inventory/StockOperationDialog';
import { ItemUnitsPanel } from '@/components/inventory/ItemUnitsPanel';
import { QrCodeDialog } from '@/components/inventory/QrCodeDialog';
import type { InventoryItem } from '@/types/inventory';

export interface ItemDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemId: string | null;
}

export function ItemDetailDialog({ open, onOpenChange, itemId }: ItemDetailDialogProps) {
  const { data: item } = useInventoryItem(itemId);
  const { data: categories } = useInventoryCategories();
  const deleteItem = useDeleteInventoryItem();
  const [editOpen, setEditOpen] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [stockKind, setStockKind] = useState<'in' | 'out' | 'adjust' | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  if (!item) return null;
  const category = categories?.find((c) => c.id === item.categoryId);

  async function handleDelete() {
    setDeleteError(null);
    try {
      await deleteItem.mutateAsync(item!.id);
      onOpenChange(false);
    } catch (error) {
      setDeleteError(
        error instanceof ApiRequestError && error.code === 'ITEM_HAS_STOCK'
          ? 'Stokda məhsul qalıb — əvvəlcə stoku sıfırlayın.'
          : 'Silinmədi.',
      );
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{item.name}</DialogTitle>
            <DialogDescription>
              {category?.name ?? '—'} · SKU: {item.sku}
            </DialogDescription>
          </DialogHeader>

          {deleteError && (
            <div className="mb-3">
              <Alert variant="danger" title="Xəta">
                {deleteError}
              </Alert>
            </div>
          )}

          <div className="mb-4 grid grid-cols-2 gap-3 rounded-lg border border-line p-3 text-sm md:grid-cols-4">
            <div>
              <div className="text-xs text-muted-foreground">Barkod</div>
              <div className="mono font-semibold">{item.barcode ?? '—'}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Ölçü vahidi</div>
              <div className="font-semibold">{item.unit}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Alış qiyməti</div>
              <div className="font-semibold">{item.purchasePrice}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Miqdar</div>
              <div className="font-semibold">{item.isSerialized ? 'Seriyalı' : item.quantity}</div>
            </div>
          </div>

          <div className="mb-4 flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
              <Pencil className="h-4 w-4" />
              Redaktə et
            </Button>
            <Button variant="outline" size="sm" onClick={() => setMoveOpen(true)}>
              <Move className="h-4 w-4" />
              Köçür
            </Button>
            <Button variant="outline" size="sm" onClick={() => setQrOpen(true)}>
              <QrCode className="h-4 w-4" />
              QR kod
            </Button>
            {!item.isSerialized && (
              <>
                <Button variant="outline" size="sm" onClick={() => setStockKind('in')}>
                  <ArrowDownCircle className="h-4 w-4" />
                  Giriş
                </Button>
                <Button variant="outline" size="sm" onClick={() => setStockKind('out')}>
                  <ArrowUpCircle className="h-4 w-4" />
                  Çıxış
                </Button>
                <Button variant="outline" size="sm" onClick={() => setStockKind('adjust')}>
                  <ListChecks className="h-4 w-4" />
                  Sayım
                </Button>
              </>
            )}
            <Button variant="danger" size="sm" onClick={handleDelete}>
              <Trash2 className="h-4 w-4" />
              Sil
            </Button>
          </div>

          {item.isSerialized && <ItemUnitsPanel item={item} />}
        </DialogContent>
      </Dialog>

      <ItemFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        nodeId={item.nodeId}
        editingItem={item}
      />
      <MoveItemDialog open={moveOpen} onOpenChange={setMoveOpen} item={item} />
      <QrCodeDialog open={qrOpen} onOpenChange={setQrOpen} title={item.name} value={item.qrCode} />
      {stockKind && (
        <StockOperationDialog
          open={Boolean(stockKind)}
          onOpenChange={(open) => !open && setStockKind(null)}
          kind={stockKind}
          item={item}
        />
      )}
    </>
  );
}
