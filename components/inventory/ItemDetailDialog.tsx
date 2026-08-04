'use client';

import { useState } from 'react';
import {
  ArrowDownCircle,
  ArrowUpCircle,
  ChevronRight,
  ListChecks,
  Move,
  Pencil,
  QrCode,
  Trash2,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { Tabs } from '@/components/ui/tabs';
import {
  useDeleteInventoryItem,
  useInventoryCategories,
  useInventoryItem,
  useInventoryNodePath,
} from '@/hooks/use-inventory';
import { ApiRequestError } from '@/lib/api/client';
import { formatDateTime, formatMoney } from '@/lib/utils/format';
import { ItemFormDialog } from '@/components/inventory/ItemFormDialog';
import { MoveItemDialog } from '@/components/inventory/MoveItemDialog';
import { StockOperationDialog } from '@/components/inventory/StockOperationDialog';
import { ItemUnitsPanel } from '@/components/inventory/ItemUnitsPanel';
import { QrCodeDialog } from '@/components/inventory/QrCodeDialog';
import { renderAttributeValue } from '@/components/inventory/AttributeValue';
import { ApprovalSubmittedDialog } from '@/components/approval/ApprovalSubmittedDialog';
import { ItemWarrantySection } from '@/components/inventory/ItemWarrantySection';
import { ItemMovementsPanel } from '@/components/inventory/ItemMovementsPanel';
import { ItemLotsPanel } from '@/components/inventory/ItemLotsPanel';
import { cn } from '@/lib/utils';
import type { InventoryFieldType } from '@/types/inventory';

export interface ItemDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemId: string | null;
  /**
   * Folder the dialog was opened from. Stock actions default to it, so browsing the warehouse and
   * acting on what is in front of you never asks which shelf you meant.
   */
  contextNodeId?: string | null;
}

/** One label/value pair in the detail grid. */
function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-sm font-semibold">{children}</div>
    </div>
  );
}

/** Wide field types get the full row — a paragraph or a strip of photos in a half column reads badly. */
function isWideField(fieldType: InventoryFieldType): boolean {
  return fieldType === 'TEXTAREA' || fieldType === 'IMAGE' || fieldType === 'MULTI_IMAGE';
}

export function ItemDetailDialog({
  open,
  onOpenChange,
  itemId,
  contextNodeId,
}: ItemDetailDialogProps) {
  const { data: item } = useInventoryItem(itemId);
  const { data: categories } = useInventoryCategories();
  const deleteItem = useDeleteInventoryItem();
  const [editOpen, setEditOpen] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [nodeQrOpen, setNodeQrOpen] = useState(false);
  const [stockKind, setStockKind] = useState<'in' | 'out' | 'adjust' | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  // `closeAfter` because deleting leaves nothing to come back to, while a stock request does —
  // and the confirmation cannot be shown after the parent closes: this whole dialog unmounts once
  // its item is gone, taking any confirmation inside it along.
  const [approvalSent, setApprovalSent] = useState<{ title: string; closeAfter: boolean } | null>(
    null,
  );
  const [tab, setTab] = useState('umumi');

  // Hook order must stay stable, so this runs before the early return — it self-disables on null.
  // A product can be in several folders; the breadcrumb follows the one you came from, falling
  // back to its only location. With several and no context there is no single path to show.
  const focusedNodeId =
    contextNodeId && item?.locations.some((l) => l.nodeId === contextNodeId)
      ? contextNodeId
      : item?.locations.length === 1
        ? item.locations[0].nodeId
        : null;
  const { data: nodePath } = useInventoryNodePath(focusedNodeId, open && Boolean(item));

  if (!item) return null;
  // Last crumb is the leaf the product actually sits in — the one worth labelling.
  const containingNode = nodePath?.[nodePath.length - 1] ?? null;
  const category = categories?.find((c) => c.id === item.categoryId);
  const fields = (category?.fields ?? []).filter((f) => f.isVisible);

  // Tab siyahısı məzmuna görə qurulur: boş tab göstərmək istifadəçini aldadır.
  const tabItems = [
    { key: 'umumi', label: 'Ümumi' },
    ...(fields.length > 0 ? [{ key: 'saheler', label: 'Sahələr' }] : []),
    { key: 'zemanet', label: 'Zəmanət' },
    { key: 'hereketler', label: 'Hərəkətlər' },
    ...(item.isSerialized ? [{ key: 'vahidler', label: 'Vahidlər' }] : []),
    ...(item.isLotTracked ? [{ key: 'partiyalar', label: 'Partiyalar' }] : []),
  ];
  // Seçilmiş tab siyahıdan çıxıbsa (məsələn sahələr silinib) ilk taba qayıdırıq.
  const activeTab = tabItems.some((t) => t.key === tab) ? tab : 'umumi';

  async function handleDelete() {
    setDeleteError(null);
    try {
      // Deferred: this only queues the deletion for a second person to approve.
      await deleteItem.mutateAsync(item!.id);
      setApprovalSent({ title: 'Məhsul silinməsi', closeAfter: true });
    } catch (error) {
      setDeleteError(
        error instanceof ApiRequestError && error.code === 'ITEM_HAS_STOCK'
          ? 'Stokda məhsul qalıb — əvvəlcə stoku sıfırlayın.'
          : error instanceof ApiRequestError && error.code === 'ENTITY_PENDING_APPROVAL'
            ? 'Bu məhsulun təsdiq gözləyən dəyişikliyi var — əvvəlcə o qərara alınmalıdır.'
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

          <Tabs items={tabItems} value={activeTab} onChange={setTab} className="mb-4" />

          {activeTab === 'umumi' && (
          <>
          <div className="mb-4 grid grid-cols-2 gap-3 rounded-lg border border-line p-3 md:grid-cols-4">
            <DetailRow label="Barkod">
              <span className="mono">{item.barcode ?? '—'}</span>
            </DetailRow>
            <DetailRow label="Ölçü vahidi">{item.unit}</DetailRow>
            <DetailRow label="Alış qiyməti">{formatMoney(item.purchasePrice)}</DetailRow>
            <DetailRow label="Cəmi miqdar">
              {item.totalQuantity} {item.unit}
            </DetailRow>
          </div>

          <div className="mb-4">
            <div className="text-xs text-muted-foreground">
              {item.locations.length > 1 ? 'Yerləşdiyi yerlər' : 'Yerləşdiyi yer'}
            </div>

            {/* A full breadcrumb only makes sense for one folder. With several, the path of one of
                them would read as the product's location and quietly hide the rest. */}
            {focusedNodeId && (
              <div className="mt-1 flex flex-wrap items-center gap-1 text-sm">
                <span className="font-semibold text-gold">Anbar</span>
                {nodePath ? (
                  nodePath.map((node) => (
                    <span key={node.id} className="flex items-center gap-1">
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="font-semibold">{node.name}</span>
                    </span>
                  ))
                ) : (
                  <span className="text-muted-foreground">yüklənir...</span>
                )}
                {/* The shelf's own label, reachable from the product that sits on it — someone
                    holding the box needs the QR of where it goes back, not only of the box. */}
                {containingNode && (
                  <button
                    type="button"
                    onClick={() => setNodeQrOpen(true)}
                    className="btn btn-ghost btn-xs ml-1"
                    title={`${containingNode.name} qovluğunun QR kodu`}
                  >
                    <QrCode className="h-3.5 w-3.5" />
                    Qovluğun QR-ı
                  </button>
                )}
              </div>
            )}

            {item.locations.length === 0 ? (
              <p className="mt-1 text-sm text-muted-foreground">
                Bu məhsul heç bir qovluqda saxlanılmır.
              </p>
            ) : (
              <ul className="mt-2 space-y-1">
                {item.locations.map((location) => (
                  <li
                    key={location.nodeId}
                    className={cn(
                      'flex items-center justify-between rounded-lg border border-line px-3 py-2 text-sm',
                      location.nodeId === focusedNodeId && 'border-gold bg-gold-50',
                    )}
                  >
                    <span className="font-semibold">{location.nodeName ?? 'Qovluq'}</span>
                    <span className="mono">
                      {location.quantity} {item.unit}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="mb-4">
            <div className="text-xs text-muted-foreground">Qeyd</div>
            <div className="mt-0.5 whitespace-pre-wrap text-sm">
              {item.notes ? item.notes : <span className="text-muted-foreground">—</span>}
            </div>
          </div>

          <div className="mb-4 flex flex-wrap gap-x-4 gap-y-1 border-t border-line pt-3 text-xs text-muted-foreground">
            <span>Yaradılıb: {formatDateTime(item.createdAt)}</span>
            <span>Yenilənib: {formatDateTime(item.updatedAt)}</span>
          </div>
          </>
          )}

          {activeTab === 'zemanet' && <ItemWarrantySection item={item} />}

          {activeTab === 'hereketler' && <ItemMovementsPanel item={item} />}

          {activeTab === 'saheler' && fields.length > 0 && (
            <div className="mb-4 rounded-lg border border-line p-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {fields.map((field) => (
                  <div key={field.id} className={isWideField(field.fieldType) ? 'sm:col-span-2' : ''}>
                    <div className="text-xs text-muted-foreground">{field.label}</div>
                    <div className="mt-0.5 text-sm font-semibold">
                      {renderAttributeValue(field.fieldType, item.attributes?.[field.fieldKey], 'detail')}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'vahidler' && item.isSerialized && <ItemUnitsPanel item={item} />}

          {activeTab === 'partiyalar' && item.isLotTracked && (
            <ItemLotsPanel item={item} contextNodeId={focusedNodeId} />
          )}

          {/* Actions live at the very bottom so the popup reads as information first, tools after. */}
          <div className="mt-5 flex flex-wrap gap-2 border-t border-line pt-4">
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
            <Button variant="danger" size="sm" className="ml-auto" onClick={handleDelete}>
              <Trash2 className="h-4 w-4" />
              Sil
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ItemFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        nodeId={focusedNodeId ?? item.locations[0]?.nodeId ?? ''}
        editingItem={item}
      />
      <MoveItemDialog
        open={moveOpen}
        onOpenChange={setMoveOpen}
        item={item}
        contextNodeId={focusedNodeId}
      />
      <QrCodeDialog open={qrOpen} onOpenChange={setQrOpen} title={item.name} value={item.qrCode} />
      {containingNode && (
        <QrCodeDialog
          open={nodeQrOpen}
          onOpenChange={setNodeQrOpen}
          title={containingNode.name}
          value={containingNode.qrCode}
        />
      )}
      {/* Owned here rather than by the stock dialog: that one unmounts the moment it closes, and
          a confirmation living inside it would vanish with it. */}
      <ApprovalSubmittedDialog
        open={Boolean(approvalSent)}
        onOpenChange={(open) => {
          if (open) return;
          const closeParent = approvalSent?.closeAfter;
          setApprovalSent(null);
          if (closeParent) onOpenChange(false);
        }}
        description={approvalSent?.title ?? ''}
      />
      {stockKind && (
        <StockOperationDialog
          open={Boolean(stockKind)}
          onOpenChange={(open) => !open && setStockKind(null)}
          kind={stockKind}
          item={item}
          contextNodeId={focusedNodeId}
          onSubmitted={(title) => setApprovalSent({ title, closeAfter: false })}
        />
      )}
    </>
  );
}
