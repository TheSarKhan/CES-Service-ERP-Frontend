'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ScanLine } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TableWrap } from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { NodeCardBrowser } from '@/components/inventory/NodeCardBrowser';
import { QrScanDialog } from '@/components/inventory/QrScanDialog';
import { ItemDetailDialog } from '@/components/inventory/ItemDetailDialog';
import { useInventoryItemUnit, useInventoryNode } from '@/hooks/use-inventory';
import type { InventoryLookupResult } from '@/types/inventory';

export default function WarehousePage() {
  const searchParams = useSearchParams();
  const initialNodeId = searchParams.get('nodeId');
  const [scanOpen, setScanOpen] = useState(false);
  const [scannedNodeId, setScannedNodeId] = useState<string | null>(null);
  const [scannedItemId, setScannedItemId] = useState<string | null>(null);
  const [scannedUnitId, setScannedUnitId] = useState<string | null>(null);

  const { data: scannedNode } = useInventoryNode(scannedNodeId);
  const { data: scannedUnit } = useInventoryItemUnit(scannedUnitId);

  // Once a scanned unit's owning item resolves, open that item's detail (the unit itself is
  // visible inside its serialized-units panel).
  useEffect(() => {
    if (scannedUnit) {
      setScannedItemId(scannedUnit.itemId);
      setScannedUnitId(null);
    }
  }, [scannedUnit]);

  function handleScanResult(result: InventoryLookupResult) {
    if (result.type === 'NODE') {
      setScannedNodeId(result.id);
    } else if (result.type === 'ITEM') {
      setScannedItemId(result.id);
    } else {
      setScannedUnitId(result.id);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Anbar</h1>
          <p className="text-sm text-muted-foreground">
            Dinamik Layer strukturu üzrə naviqasiya və məhsullar
          </p>
        </div>
        <Button variant="gold" size="sm" onClick={() => setScanOpen(true)}>
          <ScanLine className="h-4 w-4" />
          QR / Barkod skan et
        </Button>
      </div>

      <TableWrap className="p-4">
        <NodeCardBrowser initialNodeId={initialNodeId} />
      </TableWrap>

      <QrScanDialog open={scanOpen} onOpenChange={setScanOpen} onResult={handleScanResult} />
      <ItemDetailDialog
        open={Boolean(scannedItemId)}
        onOpenChange={(open) => !open && setScannedItemId(null)}
        itemId={scannedItemId}
      />
      <Dialog open={Boolean(scannedNodeId)} onOpenChange={(open) => !open && setScannedNodeId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{scannedNode?.name ?? 'Node'}</DialogTitle>
            <DialogDescription>
              Bu node-u tapmaq üçün Anbar/Konfiqurasiya bölmələrindən naviqasiya edin
            </DialogDescription>
          </DialogHeader>
          {scannedNode && (
            <div className="space-y-2 text-sm">
              {scannedNode.code && (
                <div>
                  <span className="text-muted-foreground">Kod: </span>
                  <span className="mono font-semibold">{scannedNode.code}</span>
                </div>
              )}
              <div>
                <span className="text-muted-foreground">Status: </span>
                <span className="font-semibold">{scannedNode.isActive ? 'Aktiv' : 'Deaktiv'}</span>
              </div>
              {scannedNode.notes && (
                <div>
                  <span className="text-muted-foreground">Qeyd: </span>
                  {scannedNode.notes}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
