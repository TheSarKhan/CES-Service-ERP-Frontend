'use client';

import { useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Copy, Download, Printer } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { buildScanUrl } from '@/lib/utils/qr';

export interface QrCodeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  value: string | null;
}

/** Export geometry — the label is QR on top, name underneath, on a white background. */
const EXPORT_QR_SIZE = 600;
const EXPORT_PADDING = 48;
const EXPORT_NAME_BAND = 96;

/** Strips characters that browsers/filesystems reject in a download name. */
function toFileName(title: string): string {
  const cleaned = title.replace(/[\\/:*?"<>|]+/g, '-').replace(/\s+/g, '-').trim();
  return cleaned.length > 0 ? cleaned : 'qr';
}

/** Displays a printable QR code for a node/item/unit's system-generated tracking code. */
export function QrCodeDialog({ open, onOpenChange, title, value }: QrCodeDialogProps) {
  const qrRef = useRef<HTMLDivElement>(null);

  // The label encodes a URL rather than the raw tracking code: a phone's camera app shows the QR
  // content as-is, and a bare UUID tells the person holding the label nothing.
  const scanUrl = value ? buildScanUrl(value) : null;

  /** Standalone copy of the on-screen QR, sized for export and namespaced so it can stand alone. */
  function cloneQrSvg(size: number): SVGSVGElement | null {
    const svg = qrRef.current?.querySelector('svg');
    if (!svg) return null;
    const clone = svg.cloneNode(true) as SVGSVGElement;
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    clone.setAttribute('width', String(size));
    clone.setAttribute('height', String(size));
    return clone;
  }

  /**
   * Prints just the label (QR + name) via a throwaway iframe rather than `window.print()` on the
   * page itself. Radix renders the dialog inside a `transform`ed container, which makes any
   * `position: fixed` print overlay resolve against that box and get clipped — so a page-level
   * `@media print` rule can't reliably lay the label out. A separate document has none of that.
   */
  function handlePrint() {
    const qr = cloneQrSvg(220);
    if (!qr) return;

    const frame = document.createElement('iframe');
    frame.setAttribute('aria-hidden', 'true');
    frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;';
    document.body.appendChild(frame);

    const doc = frame.contentWindow?.document;
    if (!doc) {
      frame.remove();
      return;
    }

    doc.open();
    doc.write(
      '<!doctype html><html><head><meta charset="utf-8"><style>' +
        // Zero page margin is what suppresses the browser's own header/footer (date, page URL,
        // page number) — those are drawn *into* the margin, so with no margin there's nowhere
        // for them to go. The breathing room comes from body padding instead.
        '@page{margin:0}' +
        'html,body{margin:0}' +
        'body{box-sizing:border-box;min-height:100vh;padding:16mm;' +
        'display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;' +
        "font-family:system-ui,-apple-system,sans-serif}" +
        '.qr-name{font-size:16px;font-weight:700;text-align:center}' +
        '</style></head><body><div class="qr-box"></div><div class="qr-name"></div></body></html>',
    );
    doc.close();

    // Inserted via the DOM (not the markup string) so a name with < or & can't break the document.
    doc.querySelector('.qr-box')!.appendChild(qr);
    doc.querySelector('.qr-name')!.textContent = title;

    frame.contentWindow!.focus();
    frame.contentWindow!.print();
    // Safari/Firefox return from print() before the dialog closes; give them a beat, then clean up.
    setTimeout(() => frame.remove(), 1000);
  }

  /** Downloads the same label as a PNG, for pasting into docs or sending to a label printer. */
  async function handleDownloadImage() {
    const qr = cloneQrSvg(EXPORT_QR_SIZE);
    if (!qr) return;

    const svgUrl =
      'data:image/svg+xml;charset=utf-8,' +
      encodeURIComponent(new XMLSerializer().serializeToString(qr));

    const image = new Image();
    try {
      await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = () => reject(new Error('QR image failed to load'));
        image.src = svgUrl;
      });
    } catch {
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = EXPORT_QR_SIZE + EXPORT_PADDING * 2;
    canvas.height = EXPORT_QR_SIZE + EXPORT_PADDING * 2 + EXPORT_NAME_BAND;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, EXPORT_PADDING, EXPORT_PADDING, EXPORT_QR_SIZE, EXPORT_QR_SIZE);

    // Shrink the name until it fits the label width rather than letting it run off the canvas.
    const maxTextWidth = canvas.width - EXPORT_PADDING * 2;
    let fontSize = 44;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    do {
      ctx.font = `bold ${fontSize}px system-ui, -apple-system, sans-serif`;
      if (ctx.measureText(title).width <= maxTextWidth) break;
      fontSize -= 2;
    } while (fontSize > 18);

    ctx.fillStyle = '#1a1a1a';
    ctx.fillText(
      title,
      canvas.width / 2,
      EXPORT_QR_SIZE + EXPORT_PADDING + EXPORT_NAME_BAND / 2,
    );

    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${toFileName(title)}-qr.png`;
      link.click();
      URL.revokeObjectURL(url);
    }, 'image/png');
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>Çap edib fiziki yerə/məhsula yapışdırın</DialogDescription>
        </DialogHeader>

        {value ? (
          <div ref={qrRef} className="flex flex-col items-center gap-3 py-2">
            <div className="rounded-xl border border-line bg-white p-4">
              <QRCodeSVG value={scanUrl ?? value} size={200} />
            </div>
            <span className="mono break-all text-center text-xs text-muted-foreground">{scanUrl}</span>
          </div>
        ) : (
          <p className="py-4 text-center text-sm text-muted-foreground">Bu obyekt üçün QR kod yoxdur.</p>
        )}

        <DialogFooter className="flex-wrap">
          <Button
            type="button"
            variant="outline"
            onClick={() => scanUrl && navigator.clipboard.writeText(scanUrl)}
            disabled={!value}
          >
            <Copy className="h-4 w-4" />
            Kopyala
          </Button>
          <Button type="button" variant="outline" onClick={handleDownloadImage} disabled={!value}>
            <Download className="h-4 w-4" />
            PNG yüklə
          </Button>
          <Button type="button" variant="primary" onClick={handlePrint} disabled={!value}>
            <Printer className="h-4 w-4" />
            Çap et
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
