'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, Check, Folder, Pencil, Plus, QrCode, Trash2 } from 'lucide-react';
import { useDeleteInventoryNode, useInventoryNodeChildren } from '@/hooks/use-inventory';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Empty } from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert } from '@/components/ui/alert';
import { NodeFormDialog } from '@/components/inventory/NodeFormDialog';
import { QrCodeDialog } from '@/components/inventory/QrCodeDialog';
import { ApiRequestError } from '@/lib/api/client';
import { cn } from '@/lib/utils';
import type { InventoryNode } from '@/types/inventory';

const INDENT_PX = 20;

export interface NodeTreeProps {
  /**
   * 'manage' shows create/edit/delete actions. 'browse' makes every row selectable via
   * onRowClick — childless rows select on name-click, rows with children get an explicit
   * "seç" button next to the name (name-click there still expands/collapses instead).
   */
  mode: 'manage' | 'browse';
  onRowClick?: (node: InventoryNode) => void;
  selectedId?: string | null;
}

/**
 * Layer (dynamic storage tree) viewer — a fully nested, indented list with per-row lazy
 * expand/collapse (children are only fetched once a row is expanded), rather than a single-level
 * breadcrumb drill-down.
 */
export function NodeTree({ mode, onRowClick, selectedId }: NodeTreeProps) {
  const [createParentId, setCreateParentId] = useState<string | null | undefined>(undefined);
  const [editingNode, setEditingNode] = useState<InventoryNode | null>(null);
  const [qrNode, setQrNode] = useState<InventoryNode | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: rootNodes, isLoading, isError } = useInventoryNodeChildren(undefined);
  const deleteNode = useDeleteInventoryNode();

  async function handleDelete(node: InventoryNode) {
    setError(null);
    try {
      await deleteNode.mutateAsync(node.id);
    } catch (err) {
      setError(
        err instanceof ApiRequestError && err.code === 'NODE_NOT_EMPTY'
          ? `“${node.name}” node-unun alt node-ları və ya məhsulları var — əvvəlcə onları silin.`
          : 'Silinmədi.',
      );
    }
  }

  return (
    <div>
      {mode === 'manage' && (
        <div className="mb-3 flex justify-end">
          <Button variant="outline" size="sm" onClick={() => setCreateParentId(null)}>
            <Plus className="h-4 w-4" />
            Kök node
          </Button>
        </div>
      )}

      {error && (
        <div className="mb-3">
          <Alert variant="danger" title="Xəta">
            {error}
          </Alert>
        </div>
      )}
      {isError && (
        <Alert variant="danger" title="Yüklənmədi">
          Node siyahısı yüklənə bilmədi.
        </Alert>
      )}
      {isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      )}
      {!isLoading && !isError && rootNodes && rootNodes.length === 0 && (
        <Empty
          title="Node yoxdur"
          description="Kök node yaradaraq strukturu başladın."
          icon={<Folder className="mx-auto h-12 w-12" />}
        />
      )}
      {!isLoading && !isError && rootNodes && rootNodes.length > 0 && (
        <ul>
          {rootNodes.map((node) => (
            <NodeTreeRow
              key={node.id}
              node={node}
              depth={0}
              mode={mode}
              onRowClick={onRowClick}
              selectedId={selectedId}
              onRequestCreateChild={setCreateParentId}
              onRequestEdit={setEditingNode}
              onRequestQr={setQrNode}
              onRequestDelete={handleDelete}
            />
          ))}
        </ul>
      )}

      <NodeFormDialog
        open={createParentId !== undefined}
        onOpenChange={(open) => !open && setCreateParentId(undefined)}
        parentId={createParentId ?? null}
      />
      <NodeFormDialog
        open={Boolean(editingNode)}
        onOpenChange={(open) => !open && setEditingNode(null)}
        parentId={editingNode?.parentId ?? null}
        editingNode={editingNode}
      />
      {qrNode && (
        <QrCodeDialog
          open={Boolean(qrNode)}
          onOpenChange={(open) => !open && setQrNode(null)}
          title={qrNode.name}
          value={qrNode.qrCode}
        />
      )}
    </div>
  );
}

interface NodeTreeRowProps {
  node: InventoryNode;
  depth: number;
  mode: 'manage' | 'browse';
  onRowClick?: (node: InventoryNode) => void;
  selectedId?: string | null;
  onRequestCreateChild: (parentId: string) => void;
  onRequestEdit: (node: InventoryNode) => void;
  onRequestQr: (node: InventoryNode) => void;
  onRequestDelete: (node: InventoryNode) => void;
}

function NodeTreeRow({
  node,
  depth,
  mode,
  onRowClick,
  selectedId,
  onRequestCreateChild,
  onRequestEdit,
  onRequestQr,
  onRequestDelete,
}: NodeTreeRowProps) {
  const [expanded, setExpanded] = useState(false);
  const { data: children, isLoading } = useInventoryNodeChildren(node.id, expanded);
  const isSelected = selectedId === node.id;

  function handleNameClick() {
    if (node.hasChildren) {
      setExpanded((v) => !v);
    } else if (mode === 'browse') {
      onRowClick?.(node);
    }
  }

  // A node can hold items directly whether or not it also has children, so browse mode needs an
  // explicit "select this one" action — name-click alone would only ever reach childless nodes.
  const showSelectButton = mode === 'browse' && node.hasChildren;

  return (
    <li>
      <div
        className={cn(
          'flex items-center gap-1.5 rounded-lg border border-transparent px-2 py-2 hover:border-line hover:bg-graphite-50',
          isSelected && 'border-gold bg-gold-50',
        )}
        style={{ paddingLeft: depth * INDENT_PX + 8 }}
      >
        {node.hasChildren ? (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="grid h-5 w-5 shrink-0 place-items-center text-muted-foreground"
            aria-label={expanded ? 'Yığ' : 'Aç'}
          >
            {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
        ) : (
          <span className="w-5 shrink-0" />
        )}

        <button
          type="button"
          onClick={handleNameClick}
          className={cn(
            'flex flex-1 items-center gap-2 text-left',
            (node.hasChildren || mode === 'browse') && 'cursor-pointer',
          )}
        >
          <Folder className="h-4 w-4 shrink-0 text-gold" />
          <span className="font-semibold">{node.name}</span>
          {node.code && <span className="mono text-xs text-muted-foreground">({node.code})</span>}
          {!node.isActive && (
            <Badge variant="mute" size="sm">
              Deaktiv
            </Badge>
          )}
        </button>

        <div className="flex shrink-0 items-center gap-0.5">
          {showSelectButton && (
            <button
              type="button"
              onClick={() => onRowClick?.(node)}
              className="btn btn-ghost btn-icon"
              aria-label="Bu node-u seç"
              title="Bu node-u seç"
            >
              <Check className="h-4 w-4 text-gold" />
            </button>
          )}
          <button
            type="button"
            onClick={() => onRequestQr(node)}
            className="btn btn-ghost btn-icon"
            aria-label="QR kod"
            title="QR kod"
          >
            <QrCode className="h-4 w-4" />
          </button>
          {mode === 'manage' && (
            <>
              <button
                type="button"
                onClick={() => onRequestCreateChild(node.id)}
                className="btn btn-ghost btn-icon"
                aria-label="Alt node əlavə et"
                title="Alt node əlavə et"
              >
                <Plus className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => onRequestEdit(node)}
                className="btn btn-ghost btn-icon"
                aria-label="Redaktə et"
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => onRequestDelete(node)}
                className="btn btn-ghost btn-icon"
                aria-label="Sil"
              >
                <Trash2 className="h-4 w-4 text-danger" />
              </button>
            </>
          )}
        </div>
      </div>

      {expanded && (
        <ul>
          {isLoading && (
            <li style={{ paddingLeft: (depth + 1) * INDENT_PX + 8 }} className="py-1">
              <span className="skel block h-8 w-full" />
            </li>
          )}
          {!isLoading && children?.length === 0 && (
            <li
              style={{ paddingLeft: (depth + 1) * INDENT_PX + 34 }}
              className="py-1 text-xs text-muted-foreground"
            >
              Alt node yoxdur
            </li>
          )}
          {children?.map((child) => (
            <NodeTreeRow
              key={child.id}
              node={child}
              depth={depth + 1}
              mode={mode}
              onRowClick={onRowClick}
              selectedId={selectedId}
              onRequestCreateChild={onRequestCreateChild}
              onRequestEdit={onRequestEdit}
              onRequestQr={onRequestQr}
              onRequestDelete={onRequestDelete}
            />
          ))}
        </ul>
      )}
    </li>
  );
}
