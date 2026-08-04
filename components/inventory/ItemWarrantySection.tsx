'use client';

import { useState } from 'react';
import { FileWarning, History, ShieldCheck } from 'lucide-react';
import { useItemWarrantyExtensions, useWarrantyTargetClaims } from '@/hooks/use-inventory';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ClaimStatusBadge,
  CLAIM_RESOLUTION_LABEL,
  WarrantyStatusBadge,
} from '@/components/inventory/badges';
import { WarrantyExtendDialog } from '@/components/inventory/WarrantyExtendDialog';
import { WarrantyClaimDialog } from '@/components/inventory/WarrantyClaimDialog';
import { WarrantyClaimDecisionDialog } from '@/components/inventory/WarrantyClaimDecisionDialog';
import { formatDate, formatDateTime } from '@/lib/utils/format';
import type { InventoryItem, WarrantyClaim } from '@/types/inventory';

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
  const [claimOpen, setClaimOpen] = useState(false);
  const [decisionClaim, setDecisionClaim] = useState<WarrantyClaim | null>(null);
  const { data: history } = useItemWarrantyExtensions(item.id, historyOpen);
  // Only product-level claims: a serialized product's claims hang off individual units, and
  // showing them here would attribute one unit's failure to the whole batch.
  const { data: claims } = useWarrantyTargetClaims(
    item.isSerialized ? null : 'INVENTORY_ITEM',
    item.isSerialized ? null : item.id,
  );

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
            <>
              <Button variant="ghost" size="xs" onClick={() => setClaimOpen(true)}>
                <FileWarning className="h-3.5 w-3.5" />
                Tələb aç
              </Button>
              <Button variant="outline" size="xs" onClick={() => setExtendOpen(true)}>
                Uzat
              </Button>
            </>
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
        <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
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
          <div>
            <div className="text-xs text-muted-foreground">Təchizatçı</div>
            <div className="mt-0.5 font-semibold">{item.supplier || '—'}</div>
          </div>
        </div>
      )}

      {isSerialized && item.supplier && (
        <div className="mt-2 text-sm">
          <span className="text-xs text-muted-foreground">Təchizatçı: </span>
          <span className="font-semibold">{item.supplier}</span>
        </div>
      )}

      {!isSerialized && claims && claims.length > 0 && (
        <div className="mt-3 border-t border-line pt-3">
          <div className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
            Zəmanət tələbləri
          </div>
          <ul className="space-y-1.5">
            {claims.map((claim) => (
              <li key={claim.id}>
                <button
                  type="button"
                  onClick={() => setDecisionClaim(claim)}
                  className="flex w-full flex-wrap items-center gap-2 rounded-lg border border-line px-3 py-2 text-left text-sm transition-colors hover:border-graphite"
                >
                  <span className="font-semibold">{formatDate(claim.submittedAt)}</span>
                  <span className="text-xs text-muted-foreground">
                    {claim.supplier || 'Təchizatçı göstərilməyib'}
                    {claim.claimNumber ? ` · ${claim.claimNumber}` : ''}
                  </span>
                  <span className="ml-auto flex items-center gap-1.5">
                    <ClaimStatusBadge status={claim.status} />
                    {claim.resolution && (
                      <Badge variant="mute" size="sm">
                        {CLAIM_RESOLUTION_LABEL[claim.resolution]}
                      </Badge>
                    )}
                  </span>
                </button>
              </li>
            ))}
          </ul>
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

      <WarrantyClaimDialog
        open={claimOpen}
        onOpenChange={setClaimOpen}
        targetType="INVENTORY_ITEM"
        targetId={item.id}
        targetLabel={item.name}
        defaultSupplier={item.supplier}
      />

      <WarrantyClaimDecisionDialog
        open={Boolean(decisionClaim)}
        onOpenChange={(open) => !open && setDecisionClaim(null)}
        claim={decisionClaim}
      />
    </div>
  );
}
