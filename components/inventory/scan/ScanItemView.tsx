'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Package } from 'lucide-react';
import {
  useInventoryCategories,
  useInventoryItem,
  useInventoryNodePath,
} from '@/hooks/use-inventory';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { TableWrap } from '@/components/ui/table';
import { ScanLocation } from '@/components/inventory/scan/ScanLocation';
import { ItemDetailDialog } from '@/components/inventory/ItemDetailDialog';
import { renderAttributeValue } from '@/components/inventory/AttributeValue';
import { formatMoney } from '@/lib/utils/format';

/** What a scanned product label shows: what it is, where it sits, and its field values. */
export function ScanItemView({ itemId }: { itemId: string }) {
  const router = useRouter();
  const { data: item, isLoading } = useInventoryItem(itemId);
  const { data: categories } = useInventoryCategories();
  const primaryNodeId = item?.locations[0]?.nodeId ?? null;
  const { data: path } = useInventoryNodePath(primaryNodeId, Boolean(item));
  const [detailOpen, setDetailOpen] = useState(false);

  if (isLoading || !item) {
    return (
      <TableWrap className="p-4">
        <Skeleton className="h-24 w-full" />
      </TableWrap>
    );
  }

  const category = categories?.find((c) => c.id === item.categoryId);
  const fields = (category?.fields ?? []).filter((f) => f.isVisible);
  const image = item.attributes?.sekil as string | undefined;

  return (
    <div className="space-y-4">
      <TableWrap className="p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            {image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={image} alt="" className="h-16 w-16 shrink-0 rounded-lg border border-line object-cover" />
            ) : (
              <div className="grid h-16 w-16 shrink-0 place-items-center rounded-lg bg-graphite-50 text-muted-foreground">
                <Package className="h-6 w-6" />
              </div>
            )}
            <div>
              <div className="text-lg font-bold">{item.name}</div>
              <div className="text-xs text-muted-foreground">
                {category?.name ?? '—'} · SKU: {item.sku}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => setDetailOpen(true)}>
              Ətraflı
            </Button>
            <Button
              variant="primary"
              size="sm"
              disabled={!primaryNodeId}
              onClick={() => router.push(`/warehouse?nodeId=${primaryNodeId}`)}
            >
              Anbarda aç
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 border-t border-line pt-3 md:grid-cols-4">
          <div>
            <div className="text-xs text-muted-foreground">Miqdar</div>
            <div className="mt-0.5 text-sm font-semibold">
              {`${item.totalQuantity} ${item.unit}`}
              {item.isSerialized && (
                <Badge variant="info" size="sm" className="ml-1.5">
                  Seriyalı
                </Badge>
              )}
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Barkod</div>
            <div className="mono mt-0.5 text-sm font-semibold">{item.barcode ?? '—'}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Alış qiyməti</div>
            <div className="mt-0.5 text-sm font-semibold">{formatMoney(item.purchasePrice)}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Ölçü vahidi</div>
            <div className="mt-0.5 text-sm font-semibold">{item.unit}</div>
          </div>
        </div>

        <div className="mt-4 border-t border-line pt-3">
          <ScanLocation path={path} />
        </div>
      </TableWrap>

      {fields.length > 0 && (
        <TableWrap className="p-4">
          <div className="mb-3 text-sm font-bold">Sahələr</div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {fields.map((field) => (
              <div key={field.id}>
                <div className="text-xs text-muted-foreground">{field.label}</div>
                <div className="mt-0.5 text-sm font-semibold">
                  {renderAttributeValue(field.fieldType, item.attributes?.[field.fieldKey], 'detail')}
                </div>
              </div>
            ))}
          </div>
        </TableWrap>
      )}

      <ItemDetailDialog open={detailOpen} onOpenChange={setDetailOpen} itemId={itemId} />
    </div>
  );
}
