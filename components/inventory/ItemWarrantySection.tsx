'use client';

import { useState } from 'react';
import { History, ShieldCheck } from 'lucide-react';
import { useItemWarrantyExtensions } from '@/hooks/use-inventory';
import { Button } from '@/components/ui/button';
import { WarrantyStatusBadge } from '@/components/inventory/badges';
import { WarrantyExtendDialog } from '@/components/inventory/WarrantyExtendDialog';
import { formatDate, formatDateTime } from '@/lib/utils/format';
import type { InventoryItem } from '@/types/inventory';

/**
 * Warranty block of the product detail dialog.
 *
 * A serialized product has no warranty window of its own — each unit carries its own dates — so
 * this shows the months as a default for new units and points at the units panel instead of
 * offering an extend button that the API would refuse.
 */
export function ItemWarrantySection({ item }: { item: InventoryItem }) {
  const [extendOpen, setExtendOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const { data: history } = useItemWarrantyExtensions(item.id, historyOpen);

  const isSerialized = item.isSerialized;
  const hasWarranty = Boolean(item.warrantyEndDate) || Boolean(item.warrantyMonths);

  return (
    <div className="mb-4 rounded-lg border border-line p-3">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5 text-gold" />
          Zəmanət
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {!isSerialized && <WarrantyStatusBadge status={item.warrantyStatus} />}
          <Button variant="ghost" size="xs" onClick={() => setHistoryOpen((v) => !v)}>
            <History className="h-3.5 w-3.5" />
            Tarixçə
          </Button>
          {!isSerialized && (
            <Button variant="outline" size="xs" onClick={() => setExtendOpen(true)}>
              Uzat
            </Button>
          )}
        </div>
      </div>

      {isSerialized ? (
        <div className="text-sm">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-xs text-muted-foreground">Standart müddət</div>
              <div className="mt-0.5 font-semibold">
                {item.warrantyMonths ? `${item.warrantyMonths} ay` : '—'}
              </div>
            </div>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Bu seriyalı məhsuldur — zəmanət hər vahidin üzərindədir. Yuxarıdakı müddət yalnız yeni
            vahidlər üçün başlanğıc dəyər kimi işləyir; uzatma aşağıdakı vahidlər siyahısından
            edilir.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-3">
          <div>
            <div className="text-xs text-muted-foreground">Müddət</div>
            <div className="mt-0.5 font-semibold">
              {item.warrantyMonths ? `${item.warrantyMonths} ay` : '—'}
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Başlanğıc</div>
            <div className="mt-0.5 font-semibold">{formatDate(item.warrantyStartDate)}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Bitmə</div>
            <div className="mt-0.5 font-semibold">{formatDate(item.warrantyEndDate)}</div>
          </div>
        </div>
      )}

      {!isSerialized && !hasWarranty && (
        <p className="mt-2 text-xs text-muted-foreground">
          Bu məhsul üçün zəmanət təyin edilməyib — «Redaktə et»-dən əlavə edin.
        </p>
      )}

      {historyOpen && (
        <div className="mt-3 border-t border-line pt-3">
          <div className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
            Uzatma tarixçəsi
          </div>
          {!history || history.length === 0 ? (
            <p className="text-sm text-muted-foreground">Uzatma qeydi yoxdur.</p>
          ) : (
            <ul className="space-y-1.5">
              {history.map((entry) => (
                <li key={entry.id} className="rounded-lg border border-line px-3 py-2 text-sm">
                  <div className="flex flex-wrap items-center gap-1.5 font-semibold">
                    {formatDate(entry.previousEndDate)} → {formatDate(entry.newEndDate)}
                    {entry.monthsAdded && (
                      <span className="text-xs font-normal text-muted-foreground">
                        (+{entry.monthsAdded} ay)
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    {formatDateTime(entry.createdAt)}
                    {entry.reason ? ` · ${entry.reason}` : ''}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <WarrantyExtendDialog
        open={extendOpen}
        onOpenChange={setExtendOpen}
        target="item"
        id={item.id}
        label={item.name}
        currentEndDate={item.warrantyEndDate}
      />
    </div>
  );
}
