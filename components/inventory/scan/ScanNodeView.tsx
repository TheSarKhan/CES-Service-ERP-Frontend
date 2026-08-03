'use client';

import { useRouter } from 'next/navigation';
import { ArrowRight, Folder, Package } from 'lucide-react';
import {
  useInventoryCategories,
  useInventoryItems,
  useInventoryNode,
  useInventoryNodeChildren,
  useInventoryNodePath,
} from '@/hooks/use-inventory';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { TableWrap } from '@/components/ui/table';
import { ScanLocation } from '@/components/inventory/scan/ScanLocation';
import { ItemNameCell } from '@/components/inventory/AttributeValue';

const ITEM_PAGE_SIZE = 50;

/**
 * What a scanned folder label shows: where the folder sits, the sub-folders under it, and the
 * products it holds directly. A node can carry both at once, so neither list is hidden when the
 * other is present.
 */
export function ScanNodeView({ nodeId }: { nodeId: string }) {
  const router = useRouter();
  const { data: node, isLoading } = useInventoryNode(nodeId);
  const { data: path } = useInventoryNodePath(nodeId);
  const { data: children } = useInventoryNodeChildren(nodeId);
  const { data: itemPage } = useInventoryItems({ nodeId, size: ITEM_PAGE_SIZE });
  const { data: categories } = useInventoryCategories();

  const items = itemPage?.items ?? [];
  const childList = children ?? [];

  if (isLoading || !node) {
    return (
      <TableWrap className="p-4">
        <Skeleton className="h-24 w-full" />
      </TableWrap>
    );
  }

  return (
    <div className="space-y-4">
      <TableWrap className="p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <Folder className="h-6 w-6 shrink-0 text-gold" />
            <div>
              <div className="text-lg font-bold">{node.name}</div>
              <div className="text-xs text-muted-foreground">
                Qovluq{node.code ? ` · ${node.code}` : ''}
              </div>
            </div>
            {!node.isActive && (
              <Badge variant="mute" size="sm">
                Deaktiv
              </Badge>
            )}
          </div>
          <Button variant="primary" size="sm" onClick={() => router.push(`/warehouse?nodeId=${node.id}`)}>
            Anbarda aç
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="mt-4 border-t border-line pt-3">
          <ScanLocation path={path} />
        </div>
      </TableWrap>

      <TableWrap className="p-4">
        <div className="mb-3 flex items-center gap-2">
          <span className="text-sm font-bold">Alt qovluqlar</span>
          <Badge variant="mute" size="sm">
            {childList.length}
          </Badge>
        </div>
        {childList.length === 0 ? (
          <p className="text-sm text-muted-foreground">Alt qovluq yoxdur.</p>
        ) : (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {childList.map((child) => (
              <button
                key={child.id}
                type="button"
                onClick={() => router.push(`/warehouse?nodeId=${child.id}`)}
                className="flex items-center gap-2 rounded-lg border border-line px-3 py-2.5 text-left transition-colors hover:border-gold hover:bg-graphite-50"
              >
                <Folder className="h-4 w-4 shrink-0 text-gold" />
                <span className="truncate font-semibold">{child.name}</span>
                {child.code && (
                  <span className="mono ml-auto shrink-0 text-xs text-muted-foreground">{child.code}</span>
                )}
              </button>
            ))}
          </div>
        )}
      </TableWrap>

      <TableWrap className="p-4">
        <div className="mb-3 flex items-center gap-2">
          <span className="text-sm font-bold">Bu qovluqdakı məhsullar</span>
          <Badge variant="mute" size="sm">
            {itemPage?.meta?.total_items ?? items.length}
          </Badge>
        </div>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">Bu qovluqda birbaşa məhsul yoxdur.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-line">
            <table className="tbl w-full">
              <thead>
                <tr>
                  <th>Ad</th>
                  <th>SKU</th>
                  <th>Kateqoriya</th>
                  <th className="r">Miqdar</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <ItemNameCell
                        name={item.name}
                        imageUrl={item.attributes?.sekil as string | undefined}
                        warrantyStatus={item.warrantyStatus}
                      />
                    </td>
                    <td className="mono">{item.sku}</td>
                    <td>{categories?.find((c) => c.id === item.categoryId)?.name ?? '—'}</td>
                    <td className="r">
                      {item.isSerialized ? (
                        <Badge variant="info" size="sm">
                          Seriyalı
                        </Badge>
                      ) : (
                        `${item.quantity} ${item.unit}`
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {itemPage?.meta && itemPage.meta.total_items > items.length && (
          <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Package className="h-3.5 w-3.5" />
            İlk {items.length} məhsul göstərilir — hamısı üçün «Anbarda aç».
          </p>
        )}
      </TableWrap>
    </div>
  );
}
