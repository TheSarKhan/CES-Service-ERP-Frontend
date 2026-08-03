'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronRight, MapPin, Package, Search } from 'lucide-react';
import { useInventoryCategories, useInventoryItems, useInventoryNodePath } from '@/hooks/use-inventory';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Empty } from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert } from '@/components/ui/alert';
import { Pagination } from '@/components/ui/pagination';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ItemNameCell, renderAttributeValue } from '@/components/inventory/AttributeValue';
import { ItemDetailDialog } from '@/components/inventory/ItemDetailDialog';
import type { InventoryFieldType } from '@/types/inventory';

const PAGE_SIZE = 20;

/**
 * The auto-seeded fields on every category (see InventoryCategoryService.SYSTEM_FIELDS on the
 * backend) — since every category has these under the same fieldKey, they're safe to show as
 * fixed columns in a cross-category results table, unlike a category's own custom fields.
 * "Şəkil" is excluded here — it renders inline with the name (see `ItemNameCell`) instead.
 */
const SYSTEM_FIELD_COLUMNS: { key: string; label: string; type: InventoryFieldType }[] = [
  { key: 'aciqlama', label: 'Açıqlama', type: 'TEXTAREA' },
  { key: 'istehsalci', label: 'İstehsalçı / Təchizatçı', type: 'TEXT' },
  { key: 'veziyyet', label: 'Vəziyyət', type: 'TEXT' },
];

/**
 * "Bax" opens a popup with the node's full breadcrumb (fetched lazily, only while open); "Get"
 * navigates to the Anbar browser pre-drilled down to that exact node.
 */
function LocationCell({ nodeId }: { nodeId: string }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { data: path, isLoading } = useInventoryNodePath(nodeId, open);
  const currentNode = path?.[path.length - 1];

  function handleGet() {
    setOpen(false);
    router.push(`/warehouse?nodeId=${nodeId}`);
  }

  return (
    <>
      <Button variant="outline" size="xs" onClick={(e) => { e.stopPropagation(); setOpen(true); }}>
        <MapPin className="h-3.5 w-3.5" />
        Bax
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm" onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>Yerləşdiyi yer</DialogTitle>
          </DialogHeader>
          {isLoading && <p className="text-sm text-muted-foreground">Yüklənir...</p>}
          {!isLoading && path && (
            <div className="flex flex-wrap items-center gap-1 text-sm">
              <span className="font-semibold text-gold">Anbar</span>
              {path.map((node) => (
                <span key={node.id} className="flex items-center gap-1">
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="font-semibold">{node.name}</span>
                </span>
              ))}
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Bağla
            </Button>
            <Button type="button" variant="primary" onClick={handleGet} disabled={!currentNode}>
              Get
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/** Global search across every product — by name, SKU, barcode, or any dynamic-field value. */
export function ProductSearchPanel() {
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [page, setPage] = useState(1);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  const hasQuery = search.trim().length > 0;
  const { data: categories } = useInventoryCategories();
  const { data, isLoading, isError } = useInventoryItems(
    { search, categoryId: categoryId || undefined, page, size: PAGE_SIZE },
    hasQuery,
  );
  const items = data?.items ?? [];
  const meta = data?.meta;

  return (
    <div>
      <div className="mb-4">
        <h3 className="text-base font-bold">Məhsul axtarışı</h3>
        <p className="text-sm text-muted-foreground">
          Ad, SKU, barkod və ya istənilən dinamik sahə dəyəri üzrə bütün məhsulları axtarın
        </p>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Input
          inputSize="sm"
          wrapperClassName="max-w-md"
          placeholder="Ad, SKU, barkod, marka, təsvir..."
          icon={<Search className="h-4 w-4" />}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
        <select
          className="h-9 rounded-[11px] border border-line bg-white px-3 text-sm"
          value={categoryId}
          onChange={(e) => {
            setCategoryId(e.target.value);
            setPage(1);
          }}
        >
          <option value="">Bütün kateqoriyalar</option>
          {categories?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {isError && (
        <Alert variant="danger" title="Yüklənmədi">
          Axtarış nəticələri yüklənə bilmədi.
        </Alert>
      )}
      {isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      )}
      {!isLoading && !isError && items.length === 0 && (
        <Empty
          title={search ? 'Nəticə tapılmadı' : 'Axtarış üçün yazın'}
          description={
            search
              ? 'Axtarış şərtlərinə uyğun heç bir məhsul yoxdur.'
              : 'Yuxarıdakı sahəyə ad, SKU, barkod və ya hər hansı dinamik sahə dəyəri yazın.'
          }
          icon={<Package className="mx-auto h-12 w-12" />}
        />
      )}
      {!isLoading && !isError && items.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-line">
          <table className="tbl w-full">
            <thead>
              <tr>
                <th>Ad</th>
                {SYSTEM_FIELD_COLUMNS.map((col) => (
                  <th key={col.key}>{col.label}</th>
                ))}
                <th>SKU</th>
                <th>Barkod</th>
                <th>Kateqoriya</th>
                <th className="r">Miqdar</th>
                <th>Yer</th>
                <th className="r">Əməliyyat</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} onClick={() => setSelectedItemId(item.id)} className="cursor-pointer">
                  <td>
                    <ItemNameCell
                        name={item.name}
                        imageUrl={item.attributes?.sekil as string | undefined}
                        warrantyStatus={item.warrantyStatus}
                      />
                  </td>
                  {SYSTEM_FIELD_COLUMNS.map((col) => (
                    <td key={col.key}>{renderAttributeValue(col.type, item.attributes?.[col.key])}</td>
                  ))}
                  <td className="mono">{item.sku}</td>
                  <td className="mono text-muted-foreground">{item.barcode ?? '—'}</td>
                  <td>{categories?.find((c) => c.id === item.categoryId)?.name ?? '—'}</td>
                  <td className="r">
                    {item.isSerialized ? (
                      <Badge variant="info" size="sm">
                        Seriyalı
                      </Badge>
                    ) : (
                      item.quantity
                    )}
                  </td>
                  <td>
                    <LocationCell nodeId={item.nodeId} />
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

      {!isLoading && !isError && meta && meta.total_items > 0 && (
        <div className="mt-4">
          <Pagination
            page={page}
            totalPages={meta.total_pages}
            totalItems={meta.total_items}
            pageSize={meta.size || PAGE_SIZE}
            onPageChange={setPage}
          />
        </div>
      )}

      <ItemDetailDialog
        open={Boolean(selectedItemId)}
        onOpenChange={(open) => !open && setSelectedItemId(null)}
        itemId={selectedItemId}
      />
    </div>
  );
}
