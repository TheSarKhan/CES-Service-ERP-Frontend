'use client';

import { useMemo, useState } from 'react';
import { Package, Plus } from 'lucide-react';
import { useInventoryCategories, useInventoryItems } from '@/hooks/use-inventory';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Empty } from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert } from '@/components/ui/alert';
import { ItemFormDialog } from '@/components/inventory/ItemFormDialog';
import { ItemDetailDialog } from '@/components/inventory/ItemDetailDialog';
import type { InventoryCategoryField, InventoryItem, InventoryNode } from '@/types/inventory';

const PAGE_SIZE = 200;

function renderAttributeValue(field: InventoryCategoryField, value: unknown) {
  if (value === null || value === undefined || value === '') {
    return <span className="text-muted-foreground">—</span>;
  }
  if (field.fieldType === 'IMAGE' && typeof value === 'string') {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={value} alt="" className="h-8 w-8 rounded object-cover" />;
  }
  if (field.fieldType === 'MULTI_IMAGE' && Array.isArray(value)) {
    const urls = value as string[];
    return (
      <div className="flex items-center -space-x-2">
        {urls.slice(0, 3).map((url, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={`${url}-${i}`}
            src={url}
            alt=""
            className="h-8 w-8 rounded-full border-2 border-white object-cover"
          />
        ))}
        {urls.length > 3 && (
          <span className="pl-3 text-xs text-muted-foreground">+{urls.length - 3}</span>
        )}
      </div>
    );
  }
  return <span>{String(value)}</span>;
}

/**
 * Leaf-node item table — a node may hold products from more than one category (category and
 * physical location are independent), so items are grouped into one section per category rather
 * than a single flat table. Sections come from the node's assigned categories when set
 * (SRS: "kateqoriyaya uyğun fieldlər görünə bilsin"), or — for an unrestricted node — from
 * whatever categories its existing items actually belong to.
 */
export function CategorizedItemTable({ node }: { node: InventoryNode }) {
  const { data: categories } = useInventoryCategories();
  const { data, isLoading, isError } = useInventoryItems({ nodeId: node.id, size: PAGE_SIZE });
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [createCategoryId, setCreateCategoryId] = useState<string | null>(null);

  const itemsByCategory = useMemo(() => {
    const map = new Map<string, InventoryItem[]>();
    for (const item of data?.items ?? []) {
      const bucket = map.get(item.categoryId) ?? [];
      bucket.push(item);
      map.set(item.categoryId, bucket);
    }
    return map;
  }, [data]);

  const sectionCategoryIds = useMemo(() => {
    const nodeCategoryIds = node.categoryIds ?? [];
    const ids = nodeCategoryIds.length > 0 ? nodeCategoryIds : Array.from(itemsByCategory.keys());
    return [...ids].sort((a, b) => {
      const nameA = categories?.find((c) => c.id === a)?.name ?? '';
      const nameB = categories?.find((c) => c.id === b)?.name ?? '';
      return nameA.localeCompare(nameB, 'az');
    });
  }, [node.categoryIds, itemsByCategory, categories]);

  if (isError) {
    return (
      <Alert variant="danger" title="Yüklənmədi">
        Məhsul siyahısı yüklənə bilmədi.
      </Alert>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {sectionCategoryIds.length === 0 && (
        <Empty
          title="Məhsul yoxdur"
          description="Bu node-da hələ məhsul əlavə edilməyib. Əvvəlcə Konfiqurasiya bölməsindən kateqoriya təyin edin, ya da birbaşa məhsul əlavə edin."
          icon={<Package className="mx-auto h-12 w-12" />}
          action={
            <Button variant="primary" size="sm" onClick={() => setCreateCategoryId('')}>
              <Plus className="h-4 w-4" />
              Yeni məhsul
            </Button>
          }
        />
      )}

      {sectionCategoryIds.map((categoryId) => {
        const category = categories?.find((c) => c.id === categoryId);
        const sectionItems = itemsByCategory.get(categoryId) ?? [];
        const tableFields = (category?.fields ?? []).filter((f) => f.showInTable);
        return (
          <div key={categoryId} className="rounded-xl border border-line">
            <div className="flex items-center justify-between border-b border-line bg-graphite-50 px-4 py-2.5">
              <div className="flex items-center gap-2">
                <span className="font-bold">{category?.name ?? 'Naməlum kateqoriya'}</span>
                <Badge variant="mute" size="sm">
                  {sectionItems.length}
                </Badge>
              </div>
              <Button variant="outline" size="xs" onClick={() => setCreateCategoryId(categoryId)}>
                <Plus className="h-3.5 w-3.5" />
                Məhsul əlavə et
              </Button>
            </div>

            {sectionItems.length === 0 ? (
              <p className="px-4 py-4 text-sm text-muted-foreground">Bu kateqoriyada hələ məhsul yoxdur.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="tbl w-full">
                  <thead>
                    <tr>
                      <th>Ad</th>
                      <th>SKU</th>
                      <th>Barkod</th>
                      <th>Ölçü vahidi</th>
                      {tableFields.map((field) => (
                        <th key={field.id}>{field.label}</th>
                      ))}
                      <th className="r">Miqdar</th>
                      <th className="r">Əməliyyat</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sectionItems.map((item) => (
                      <tr
                        key={item.id}
                        onClick={() => setSelectedItemId(item.id)}
                        className="cursor-pointer"
                      >
                        <td className="font-semibold">{item.name}</td>
                        <td className="mono">{item.sku}</td>
                        <td className="mono text-muted-foreground">{item.barcode ?? '—'}</td>
                        <td>{item.unit}</td>
                        {tableFields.map((field) => (
                          <td key={field.id}>{renderAttributeValue(field, item.attributes?.[field.fieldKey])}</td>
                        ))}
                        <td className="r">
                          {item.isSerialized ? (
                            <Badge variant="info" size="sm">
                              Seriyalı
                            </Badge>
                          ) : (
                            item.quantity
                          )}
                        </td>
                        <td className="r">
                          <Button
                            variant="outline"
                            size="xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedItemId(item.id);
                            }}
                          >
                            Ətraflı
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}

      <ItemFormDialog
        open={createCategoryId !== null}
        onOpenChange={(open) => !open && setCreateCategoryId(null)}
        nodeId={node.id}
        initialCategoryId={createCategoryId ?? undefined}
      />
      <ItemDetailDialog
        open={Boolean(selectedItemId)}
        onOpenChange={(open) => !open && setSelectedItemId(null)}
        itemId={selectedItemId}
      />
    </div>
  );
}
