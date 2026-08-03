'use client';

import { ChevronRight } from 'lucide-react';
import type { InventoryNode } from '@/types/inventory';

/** Root-first breadcrumb of where the scanned record physically sits. */
export function ScanLocation({ path }: { path: InventoryNode[] | undefined }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">Yerləşdiyi yer</div>
      <div className="mt-1 flex flex-wrap items-center gap-1 text-sm">
        <span className="font-semibold text-gold">Anbar</span>
        {path ? (
          path.map((node) => (
            <span key={node.id} className="flex items-center gap-1">
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="font-semibold">{node.name}</span>
            </span>
          ))
        ) : (
          <span className="text-muted-foreground">yüklənir...</span>
        )}
      </div>
    </div>
  );
}
