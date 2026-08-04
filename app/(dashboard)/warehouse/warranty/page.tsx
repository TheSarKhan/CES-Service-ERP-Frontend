'use client';

import { useState } from 'react';
import { TableWrap } from '@/components/ui/table';
import { Tabs } from '@/components/ui/tabs';
import { WarrantySearchPanel } from '@/components/inventory/WarrantySearchPanel';
import { WarrantyClaimsPanel } from '@/components/inventory/WarrantyClaimsPanel';
import { ExpiringLotsPanel } from '@/components/inventory/ExpiringLotsPanel';
import {
  WarrantyExpiryBand,
  type ExpiryBandSelection,
} from '@/components/inventory/WarrantyExpiryBand';
import type { WarrantyClaimStatus, WarrantyStatus } from '@/types/inventory';

const TABS = [
  { key: 'records', label: 'Zəmanətlər' },
  { key: 'claims', label: 'Tələblər' },
  { key: 'lots', label: 'Partiyalar' },
];

/**
 * Zəmanət — two questions in one screen: "is this still covered?" (Zəmanətlər) and "what came of
 * the claim we filed?" (Tələblər).
 *
 * The attention band sits above both because clicking a count has to be able to land in either
 * tab — an expiring warranty belongs in the search, an unanswered claim in the ledger. That's why
 * those two filters live here rather than inside the panels.
 */
export default function WarehouseWarrantyPage() {
  const [tab, setTab] = useState<string>('records');
  const [warrantyStatus, setWarrantyStatus] = useState<WarrantyStatus | ''>('');
  const [claimStatus, setClaimStatus] = useState<WarrantyClaimStatus | ''>('');

  let bandSelection: ExpiryBandSelection = null;
  if (tab === 'claims') {
    bandSelection = claimStatus === 'SUBMITTED' ? 'OPEN_CLAIMS' : null;
  } else if (warrantyStatus === 'EXPIRING_SOON' || warrantyStatus === 'EXPIRED') {
    bandSelection = warrantyStatus;
  }

  function handleBandSelect(selection: ExpiryBandSelection) {
    if (selection === 'OPEN_CLAIMS') {
      setTab('claims');
      setClaimStatus('SUBMITTED');
      return;
    }
    setTab('records');
    setWarrantyStatus(selection ?? '');
    if (selection === null) setClaimStatus('');
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Zəmanət</h1>
        <p className="text-sm text-muted-foreground">
          Zəmanət müddətləri, təchizatçı tələbləri və bitmək üzrə partiyalar
        </p>
      </div>

      <WarrantyExpiryBand selected={bandSelection} onSelect={handleBandSelect} />

      <Tabs items={TABS} value={tab} onChange={setTab} />

      <TableWrap className="p-4">
        {tab === 'records' && (
          <WarrantySearchPanel
            warrantyStatus={warrantyStatus}
            onWarrantyStatusChange={setWarrantyStatus}
          />
        )}
        {tab === 'claims' && (
          <WarrantyClaimsPanel status={claimStatus} onStatusChange={setClaimStatus} />
        )}
        {/* Batches sit here because they answer the same question in a different currency:
            something is about to stop being usable and there is a window to act. */}
        {tab === 'lots' && <ExpiringLotsPanel />}
      </TableWrap>
    </div>
  );
}
