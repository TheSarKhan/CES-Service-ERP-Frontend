'use client';

import { useMemo, useState } from 'react';
import { Package, Plus } from 'lucide-react';
import { SortableTableHead, type SortState } from '@/components/ui/table';
import { useInventoryCategories, useInventoryItemCategoryIds, useInventoryItems } from '@/hooks/use-inventory';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Empty } from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert } from '@/components/ui/alert';
import { Pagination } from '@/components/ui/pagination';
import { ItemFormDialog } from '@/components/inventory/ItemFormDialog';
import { ItemDetailDialog } from '@/components/inventory/ItemDetailDialog';
import { ItemNameCell, renderAttributeValue } from '@/components/inventory/AttributeValue';
import { StockLevelBadge } from '@/components/inventory/badges';
import { locationSummary, quantityAt } from '@/lib/utils/stock';
import type { InventoryCategory, InventoryNode } from '@/types/inventory';

const SECTION_PAGE_SIZE = 10;

/**
 * One category's item table within a node — fetches and paginates independently of every other
 * section, since each category can hold a different (and separately growing) number of items at
 * the same node.
 */
function CategorySection({
  node,
  categoryId,
  category,
  onCreateItem,
  onSelectItem,
}: {
  node: InventoryNode;
  categoryId: string;
  category: InventoryCategory | undefined;
  onCreateItem: (categoryId: string) => void;
  onSelectItem: (itemId: string) => void;
}) {
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<SortState>({ field: 'name', dir: 'asc' });

  function changeSort(next: SortState) {
    setSort(next);
    setPage(1);
  }

  const { data, isLoading, isError } = useInventoryItems({
    nodeId: node.id,
    categoryId,
    page,
    size: SECTION_PAGE_SIZE,
    sort: sort.field,
    dir: sort.dir,
  });
  const items = data?.items ?? [];
  const meta = data?.meta;
  // "Şəkil" (the auto-seeded photo field) shows inline with the name instead of its own column.
  const tableFields = (category?.fields ?? []).filter((f) => f.showInTable && f.fieldKey !== 'sekil');

  return (
    <div className="rounded-xl border border-line">
      <div className="flex items-center justify-between border-b border-line bg-graphite-50 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="font-bold">{category?.name ?? 'Naməlum kateqoriya'}</span>
          <Badge variant="mute" size="sm">
            {meta?.total_items ?? 0}
          </Badge>
        </div>
        <Button variant="outline" size="xs" onClick={() => onCreateItem(categoryId)}>
          <Plus className="h-3.5 w-3.5" />
          Məhsul əlavə et
        </Button>
      </div>

      {isError && (
        <div className="px-4 py-4">
          <Alert variant="danger" title="Yüklənmədi">
            Məhsul siyahısı yüklənə bilmədi.
          </Alert>
        </div>
      )}

      {isLoading && (
        <div className="space-y-2 p-4">
          <Skeleton className="h-10 w-full" />
        </div>
      )}

      {!isLoading && !isError && items.length === 0 && (
        <p className="px-4 py-4 text-sm text-muted-foreground">Bu kateqoriyada hələ məhsul yoxdur.</p>
      )}

      {!isLoading && !isError && items.length > 0 && (
        <>
          <div className="overflow-x-auto">
            <table className="tbl w-full">
              <thead>
                <tr>
                  <SortableTableHead field="name" sort={sort} onSortChange={changeSort}>
                    Ad
                  </SortableTableHead>
                  <SortableTableHead field="sku" sort={sort} onSortChange={changeSort}>
                    SKU
                  </SortableTableHead>
                  <SortableTableHead field="barcode" sort={sort} onSortChange={changeSort}>
                    Barkod
                  </SortableTableHead>
                  <SortableTableHead field="unit" sort={sort} onSortChange={changeSort}>
                    Ölçü vahidi
                  </SortableTableHead>
                  {tableFields.map((field) => (
                    <th key={field.id}>{field.label}</th>
                  ))}
                  <th className="r">Miqdar</th>
                  <th className="r">Əməliyyat</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} onClick={() => onSelectItem(item.id)} className="cursor-pointer">
                    <td>
                      <ItemNameCell
                        name={item.name}
                        imageUrl={item.attributes?.sekil as string | undefined}
                        warrantyStatus={item.warrantyStatus}
                      />
                    </td>
                    <td className="mono">{item.sku}</td>
                    <td className="mono text-muted-foreground">{item.barcode ?? '—'}</td>
                    <td>{item.unit}</td>
                    {tableFields.map((field) => (
                      <td key={field.id}>
                        {renderAttributeValue(field.fieldType, item.attributes?.[field.fieldKey])}
                      </td>
                    ))}
                    <td className="r">
                      {/* Quantity *here*, not everywhere: this table is a view of one shelf, and
                          showing the global total would misreport what is actually in front of
                          you. The product card shows the full picture. */}
                      {quantityAt(item, node.id)}
                      <StockLevelBadge level={item.stockLevel} />
                      {item.locations.length > 1 && (
                        <span
                          className="ml-1.5 text-xs text-muted-foreground"
                          title={locationSummary(item)}
                        >
                          / {item.totalQuantity} cəmi
                        </span>
                      )}
                    </td>
                    <td className="r">
                      <Button
                        variant="outline"
                        size="xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectItem(item.id);
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

          {meta && meta.total_pages > 1 && (
            <div className="border-t border-line px-4 py-3">
              <Pagination
                page={page}
                totalPages={meta.total_pages}
                totalItems={meta.total_items}
                pageSize={meta.size || SECTION_PAGE_SIZE}
                onPageChange={setPage}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}

/**
 * Node item table — a node may hold products from more than one category (category and physical
 * location are independent), so items are grouped into one section per category rather than a
 * single flat table. Sections come from the node's assigned categories when set (SRS:
 * "kateqoriyaya uyğun fieldlər görünə bilsin"), or — for an unrestricted node — from whatever
 * categories its existing items actually belong to (fetched via a small distinct-ids endpoint,
 * since each section now paginates its own items independently rather than deriving the category
 * list from one bulk fetch).
 *
 * A node can hold products directly whether or not it also has sub-folders (see
 * `NodeCardBrowser`), so this table is always shown, never gated on childlessness.
 * `onAddChild` is only passed in when the node currently has no children — it powers the
 * "...or create a sub-folder" half of the fully-empty-node state.
 */
export function CategorizedItemTable({
  node,
  onAddChild,
}: {
  node: InventoryNode;
  onAddChild?: () => void;
}) {
  const { data: categories } = useInventoryCategories();
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [createCategoryId, setCreateCategoryId] = useState<string | null>(null);
  const [pickedCategoryId, setPickedCategoryId] = useState('');

  const nodeCategoryIds = useMemo(() => node.categoryIds ?? [], [node.categoryIds]);
  const isRestricted = nodeCategoryIds.length > 0;
  const {
    data: presentCategoryIds,
    isLoading: idsLoading,
    isError: idsError,
  } = useInventoryItemCategoryIds(node.id, !isRestricted);

  const availableCategories = useMemo(() => {
    if (!categories) return [];
    if (nodeCategoryIds.length === 0) return categories;
    return categories.filter((c) => nodeCategoryIds.includes(c.id));
  }, [categories, nodeCategoryIds]);

  const sectionCategoryIds = useMemo(() => {
    const ids = isRestricted ? nodeCategoryIds : (presentCategoryIds ?? []);
    return [...ids].sort((a, b) => {
      const nameA = categories?.find((c) => c.id === a)?.name ?? '';
      const nameB = categories?.find((c) => c.id === b)?.name ?? '';
      return nameA.localeCompare(nameB, 'az');
    });
  }, [isRestricted, nodeCategoryIds, presentCategoryIds, categories]);

  const isLoading = !isRestricted && idsLoading;
  const isError = !isRestricted && idsError;

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

  const categoryPicker = (
    <select
      className="h-11 w-full max-w-xs rounded-[11px] border border-line bg-white px-3 text-sm"
      value={pickedCategoryId}
      onChange={(e) => {
        const value = e.target.value;
        setPickedCategoryId(value);
        if (value) setCreateCategoryId(value);
      }}
    >
      <option value="">Kateqoriya seçin...</option>
      {availableCategories.map((c) => (
        <option key={c.id} value={c.id}>
          {c.name}
        </option>
      ))}
    </select>
  );

  return (
    <div className="space-y-5">
      {sectionCategoryIds.length === 0 &&
        (onAddChild ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-dashed border-line p-5">
              <div className="mb-3">
                <div className="font-semibold">Bu qovluğa ilk məhsulu əlavə et</div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Kateqoriya seçin — cədvəl sütunları seçdiyiniz kateqoriyaya uyğun quraşdırılır.
                </p>
              </div>
              {availableCategories.length > 0 ? (
                categoryPicker
              ) : (
                <p className="text-sm text-muted-foreground">
                  Əvvəlcə Konfiqurasiya bölməsindən kateqoriya yaradın.
                </p>
              )}
            </div>
            <div className="rounded-xl border border-dashed border-line bg-graphite-50 p-5">
              <div className="mb-3">
                <div className="font-semibold">...yoxsa alt qovluq yarat</div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Bu qovluğun içində daha kiçik qovluqlar saxlanacaqsa. Məhsul və alt qovluq
                  birlikdə də ola bilər.
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={onAddChild}>
                <Plus className="h-4 w-4" />
                Alt qovluq yarat
              </Button>
            </div>
          </div>
        ) : (
          <Empty
            title="Məhsul yoxdur"
            description={
              availableCategories.length > 0
                ? 'Məhsul əlavə etmək üçün əvvəlcə onun kateqoriyasını seçin.'
                : 'Bu qovluqda hələ məhsul əlavə edilməyib. Əvvəlcə Konfiqurasiya bölməsindən kateqoriya yaradın.'
            }
            icon={<Package className="mx-auto h-12 w-12" />}
            action={availableCategories.length > 0 && categoryPicker}
          />
        ))}

      {sectionCategoryIds.map((categoryId) => (
        <CategorySection
          key={categoryId}
          node={node}
          categoryId={categoryId}
          category={categories?.find((c) => c.id === categoryId)}
          onCreateItem={setCreateCategoryId}
          onSelectItem={setSelectedItemId}
        />
      ))}

      <ItemFormDialog
        open={createCategoryId !== null}
        onOpenChange={(open) => {
          if (!open) {
            setCreateCategoryId(null);
            setPickedCategoryId('');
          }
        }}
        nodeId={node.id}
        initialCategoryId={createCategoryId ?? undefined}
      />
      <ItemDetailDialog
        open={Boolean(selectedItemId)}
        onOpenChange={(open) => !open && setSelectedItemId(null)}
        itemId={selectedItemId}
        contextNodeId={node.id}
      />
    </div>
  );
}
