'use client';

import { useEffect, useState } from 'react';
import { ChevronRight, Folder, Plus } from 'lucide-react';
import { useInventoryNodeChildren, useInventoryNodePath } from '@/hooks/use-inventory';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Empty } from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert } from '@/components/ui/alert';
import { CategorizedItemTable } from '@/components/inventory/CategorizedItemTable';
import { FolderBand } from '@/components/inventory/FolderBand';
import { NodeFormDialog } from '@/components/inventory/NodeFormDialog';
import type { InventoryNode } from '@/types/inventory';

/**
 * Card-grid Layer browser for day-to-day use ("Anbar" tab). A node can hold products directly
 * AND have sub-folders at the same time (e.g. a shelf with loose engines on it plus a few boxes
 * of bolts) — so opening any node always shows both zones: a sub-folder band (when it has
 * children) and its product table (always, since it can hold products regardless).
 */
export function NodeCardBrowser({ initialNodeId }: { initialNodeId?: string | null }) {
  const [path, setPath] = useState<InventoryNode[]>([]);
  const [createChildOpen, setCreateChildOpen] = useState(false);
  const [initialApplied, setInitialApplied] = useState(false);

  // Deep-link support (e.g. "Get" from Məhsul axtarışı) — resolve the node's ancestor chain once
  // and jump straight there, instead of forcing the user to click through from the root.
  const { data: initialPath } = useInventoryNodePath(
    initialNodeId ?? null,
    Boolean(initialNodeId) && !initialApplied,
  );

  useEffect(() => {
    if (initialPath && !initialApplied) {
      setPath(initialPath);
      setInitialApplied(true);
    }
  }, [initialPath, initialApplied]);

  const currentNode = path.length > 0 ? path[path.length - 1] : null;
  const { data: rootNodes, isLoading, isError } = useInventoryNodeChildren(undefined, !currentNode);
  const { data: children } = useInventoryNodeChildren(currentNode?.id, Boolean(currentNode));

  function goRoot() {
    setPath([]);
  }

  function goTo(index: number) {
    setPath((prev) => prev.slice(0, index + 1));
  }

  function openNode(node: InventoryNode) {
    setPath((prev) => [...prev, node]);
  }

  if (!currentNode) {
    return (
      <div>
        <div className="mb-4 flex flex-wrap items-center gap-1 text-sm">
          <span className="font-semibold text-gold">Anbar</span>
        </div>

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
        {!isLoading && !isError && rootNodes && rootNodes.length === 0 && (
          <Empty
            title="Bu səviyyədə node yoxdur"
            description="Node-lar Konfiqurasiya bölməsindən yaradılır."
            icon={<Folder className="mx-auto h-12 w-12" />}
          />
        )}
        {!isLoading && !isError && rootNodes && rootNodes.length > 0 && (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {rootNodes.map((node) => (
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
      </div>
    );
  }

  const hasChildren = (children?.length ?? 0) > 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1 text-sm">
          <button type="button" onClick={goRoot} className="font-semibold text-gold hover:underline">
            Anbar
          </button>
          {path.map((crumb, i) => (
            <span key={crumb.id} className="flex items-center gap-1">
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
              {i === path.length - 1 ? (
                <span className="font-semibold">{crumb.name}</span>
              ) : (
                <button
                  type="button"
                  onClick={() => goTo(i)}
                  className="font-semibold text-gold hover:underline"
                >
                  {crumb.name}
                </button>
              )}
            </span>
          ))}
        </div>
        <Button variant="outline" size="sm" onClick={() => setCreateChildOpen(true)}>
          <Plus className="h-4 w-4" />
          Alt qovluq yarat
        </Button>
      </div>

      {hasChildren && (
        <FolderBand nodes={children ?? []} onOpen={openNode} onAddChild={() => setCreateChildOpen(true)} />
      )}

      <CategorizedItemTable
        node={currentNode}
        onAddChild={!hasChildren ? () => setCreateChildOpen(true) : undefined}
      />

      <NodeFormDialog
        open={createChildOpen}
        onOpenChange={setCreateChildOpen}
        parentId={currentNode.id}
      />
    </div>
  );
}
