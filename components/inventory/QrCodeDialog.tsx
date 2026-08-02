'use client';

import { QRCodeSVG } from 'qrcode.react';
import { Copy, Printer } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export interface QrCodeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  value: string | null;
}

/** Displays a printable QR code for a node/item/unit's system-generated tracking code. */
export function QrCodeDialog({ open, onOpenChange, title, value }: QrCodeDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>Çap edib fiziki yerə/məhsula yapışdırın</DialogDescription>
        </DialogHeader>

        {value ? (
          <div id="inventory-qr-print" className="flex flex-col items-center gap-3 py-2">
            <div className="rounded-xl border border-line bg-white p-4">
              <QRCodeSVG value={value} size={200} />
            </div>
            <span className="mono break-all text-center text-xs text-muted-foreground">{value}</span>
          </div>
        ) : (
          <p className="py-4 text-center text-sm text-muted-foreground">Bu obyekt üçün QR kod yoxdur.</p>
        )}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => value && navigator.clipboard.writeText(value)}
            disabled={!value}
          >
            <Copy className="h-4 w-4" />
            Kodu kopyala
          </Button>
          <Button type="button" variant="primary" onClick={() => window.print()} disabled={!value}>
            <Printer className="h-4 w-4" />
            Çap et
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
