'use client';

import { useEffect, useRef, useState } from 'react';
import { ScanLine } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Alert } from '@/components/ui/alert';
import { useInventoryLookup } from '@/hooks/use-inventory';
import { ApiRequestError } from '@/lib/api/client';
import type { InventoryLookupResult } from '@/types/inventory';

const SCANNER_ELEMENT_ID = 'inventory-qr-scanner-region';

export interface QrScanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onResult: (result: InventoryLookupResult) => void;
}

/** Browser-camera QR/barcode scanner — resolves a scanned code via /inventory/lookup. */
export function QrScanDialog({ open, onOpenChange, onResult }: QrScanDialogProps) {
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<'starting' | 'scanning' | 'resolving'>('starting');
  const scannerRef = useRef<import('html5-qrcode').Html5Qrcode | null>(null);
  const lookup = useInventoryLookup();
  const resolvingRef = useRef(false);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    setError(null);
    setStatus('starting');
    resolvingRef.current = false;

    async function start() {
      const { Html5Qrcode } = await import('html5-qrcode');
      if (cancelled) return;

      const scanner = new Html5Qrcode(SCANNER_ELEMENT_ID);
      scannerRef.current = scanner;

      try {
        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          async (decodedText) => {
            if (resolvingRef.current) return;
            resolvingRef.current = true;
            setStatus('resolving');
            try {
              const result = await lookup.mutateAsync(decodedText);
              onResult(result);
              onOpenChange(false);
            } catch (lookupError) {
              resolvingRef.current = false;
              setStatus('scanning');
              setError(
                lookupError instanceof ApiRequestError
                  ? 'Bu koda uyğun heç nə tapılmadı.'
                  : 'Axtarış zamanı xəta baş verdi.',
              );
            }
          },
          undefined,
        );
        if (!cancelled) setStatus('scanning');
      } catch {
        if (!cancelled) setError('Kameraya giriş alınmadı. Brauzer icazələrini yoxlayın.');
      }
    }

    start();

    return () => {
      cancelled = true;
      const scanner = scannerRef.current;
      scannerRef.current = null;
      if (scanner) {
        scanner.stop().then(() => scanner.clear()).catch(() => {});
      }
    };
  }, [open, lookup, onOpenChange, onResult]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ScanLine className="h-5 w-5 text-gold" />
            QR / Barkod skan et
          </DialogTitle>
          <DialogDescription>Kodu kameraya tuşlayın</DialogDescription>
        </DialogHeader>

        {error && (
          <div className="mb-3">
            <Alert variant="danger" title="Xəta">
              {error}
            </Alert>
          </div>
        )}

        <div id={SCANNER_ELEMENT_ID} className="overflow-hidden rounded-xl bg-black" />

        {status === 'resolving' && (
          <p className="mt-3 text-center text-sm text-muted-foreground">Axtarılır...</p>
        )}
      </DialogContent>
    </Dialog>
  );
}
