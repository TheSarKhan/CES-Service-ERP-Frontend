'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, Folder, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { InventoryNode } from '@/types/inventory';

/**
 * Compact horizontal band of sub-folder cards, shown above a node's product table. A node can
 * hold products directly AND have sub-folders at the same time (e.g. a shelf with loose items on
 * it plus a few boxes) — this band never competes with the product table for vertical space, it
 * just collapses to a single header row when not needed.
 */
export function FolderBand({
  nodes,
  onOpen,
  onAddChild,
}: {
  nodes: InventoryNode[];
  onOpen: (node: InventoryNode) => void;
  onAddChild: () => void;
}) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="rounded-xl border border-line bg-graphite-50 p-3">
      <div className="flex items-center gap-2">
        <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
          Alt qovluqlar
        </span>
        <Badge variant="mute" size="sm">
          {nodes.length}
        </Badge>
        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          className="ml-auto flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground"
        >
          {collapsed ? 'Aç' : 'Yığ'}
          {collapsed ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
        </button>
      </div>
      {!collapsed && (
        <div className="mt-2.5 flex flex-wrap gap-2.5">
          {nodes.map((node) => (
            <button
              key={node.id}
              type="button"
              onClick={() => onOpen(node)}
              className="flex w-44 items-center gap-2.5 rounded-lg border border-line bg-white px-3 py-2.5 text-left transition-shadow hover:border-gold hover:shadow-sm"
            >
              <Folder className="h-5 w-5 shrink-0 text-gold" />
              <span className="min-w-0 truncate text-sm font-semibold">{node.name}</span>
            </button>
          ))}
          <button
            type="button"
            onClick={onAddChild}
            className="flex w-32 items-center justify-center gap-1.5 rounded-lg border border-dashed border-line px-3 py-2.5 text-sm font-medium text-muted-foreground hover:border-gold hover:text-gold"
          >
            <Plus className="h-4 w-4" />
            Yeni
          </button>
        </div>
      )}
    </div>
  );
}
