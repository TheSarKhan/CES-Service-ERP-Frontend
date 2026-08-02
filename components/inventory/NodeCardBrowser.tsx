'use client';

import { useState } from 'react';
import { ChevronRight, Folder } from 'lucide-react';
import { useInventoryNodeChildren } from '@/hooks/use-inventory';
import { Badge } from '@/components/ui/badge';
import { Empty } from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert } from '@/components/ui/alert';
import { CategorizedItemTable } from '@/components/inventory/CategorizedItemTable';
import type { InventoryNode } from '@/types/inventory';

interface Crumb {
  id: string;
  name: string;
}

/**
 * Card-grid Layer browser for day-to-day use ("Anbar" tab) — each level shows its child nodes as
 * cards; clicking a card with children drills into it, clicking a leaf card opens its item table
 * instead (nodes never both hold items and have children, so this is unambiguous).
 */
export function NodeCardBrowser() {
  const [path, setPath] = useState<Crumb[]>([]);
  const [selectedLeaf, setSelectedLeaf] = useState<InventoryNode | null>(null);

  const currentParentId = path.length > 0 ? path[path.length - 1].id : undefined;
  const { data: children, isLoading, isError } = useInventoryNodeChildren(currentParentId);

  function goRoot() {
    setPath([]);
    setSelectedLeaf(null);
  }

  function goTo(index: number) {
    setPath((prev) => prev.slice(0, index + 1));
    setSelectedLeaf(null);
  }

  function openNode(node: InventoryNode) {
    if (node.hasChildren) {
      setPath((prev) => [...prev, { id: node.id, name: node.name }]);
      setSelectedLeaf(null);
    } else {
      setSelectedLeaf(node);
    }
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-1 text-sm">
        <button type="button" onClick={goRoot} className="font-semibold text-gold hover:underline">
          Anbar
        </button>
        {path.map((crumb, i) => (
          <span key={crumb.id} className="flex items-center gap-1">
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            <button
              type="button"
              onClick={() => goTo(i)}
              className="font-semibold text-gold hover:underline"
            >
              {crumb.name}
            </button>
          </span>
        ))}
        {selectedLeaf && (
          <span className="flex items-center gap-1">
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="font-semibold">{selectedLeaf.name}</span>
          </span>
        )}
      </div>

      {selectedLeaf ? (
        <CategorizedItemTable node={selectedLeaf} />
      ) : (
        <>
          {isError && (
            <Alert variant="danger" title="Yüklənmədi">
              Node siyahısı yüklənə bilmədi.
            </Alert>
          )}
          {isLoading && (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-32 w-full" />
              ))}
            </div>
          )}
          {!isLoading && !isError && children && children.length === 0 && (
            <Empty
              title="Bu səviyyədə node yoxdur"
              description="Node-lar Konfiqurasiya bölməsindən yaradılır."
              icon={<Folder className="mx-auto h-12 w-12" />}
            />
          )}
          {!isLoading && !isError && children && children.length > 0 && (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {children.map((node) => (
                <button
                  key={node.id}
                  type="button"
                  onClick={() => openNode(node)}
                  className="card-basic flex flex-col items-center gap-2 p-6 text-center transition-shadow hover:shadow-md"
                >
                  <Folder className="h-10 w-10 text-gold" />
                  <span className="font-semibold">{node.name}</span>
                  {!node.isActive && (
                    <Badge variant="mute" size="sm">
                      Deaktiv
                    </Badge>
                  )}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
