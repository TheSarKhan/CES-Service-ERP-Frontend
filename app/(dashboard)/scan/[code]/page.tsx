'use client';

import { useEffect, useState } from 'react';
import { ScanLine } from 'lucide-react';
import { useInventoryLookup } from '@/hooks/use-inventory';
import { Alert } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { TableWrap } from '@/components/ui/table';
import { ScanNodeView } from '@/components/inventory/scan/ScanNodeView';
import { ScanItemView } from '@/components/inventory/scan/ScanItemView';
import { ScanUnitView } from '@/components/inventory/scan/ScanUnitView';
import type { InventoryLookupResult } from '@/types/inventory';

/**
 * QR landing page — what a phone camera opens when someone scans a shelf or product label.
 *
 * The label carries a code, not a type, so this first resolves it through `/inventory/lookup`
 * and then hands off to the view for whatever it turned out to be. Sitting inside the dashboard
 * route group means the auth middleware guards it: an unauthenticated scan lands on /login and
 * comes back here afterwards.
 */
export default function ScanPage({ params }: { params: { code: string } }) {
  const lookup = useInventoryLookup();
  const [result, setResult] = useState<InventoryLookupResult | null>(null);
  const [notFound, setNotFound] = useState(false);

  const code = decodeURIComponent(params.code);
  const { mutateAsync } = lookup;

  useEffect(() => {
    let cancelled = false;
    setResult(null);
    setNotFound(false);
    mutateAsync(code)
      .then((r) => {
        if (!cancelled) setResult(r);
      })
      .catch(() => {
        if (!cancelled) setNotFound(true);
      });
    return () => {
      cancelled = true;
    };
  }, [code, mutateAsync]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <ScanLine className="h-6 w-6 shrink-0 text-gold" />
        <div className="min-w-0">
          <h1 className="text-2xl font-extrabold tracking-tight">Skan nəticəsi</h1>
          <p className="mono truncate text-xs text-muted-foreground">{code}</p>
        </div>
      </div>

      {notFound && (
        <Alert variant="danger" title="Tapılmadı">
          Bu koda uyğun qovluq, məhsul və ya vahid yoxdur. Etiket köhnə ola bilər.
        </Alert>
      )}

      {!notFound && !result && (
        <TableWrap className="p-4">
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </TableWrap>
      )}

      {result?.type === 'NODE' && <ScanNodeView nodeId={result.id} />}
      {result?.type === 'ITEM' && <ScanItemView itemId={result.id} />}
      {result?.type === 'ITEM_UNIT' && <ScanUnitView unitId={result.id} />}
    </div>
  );
}
