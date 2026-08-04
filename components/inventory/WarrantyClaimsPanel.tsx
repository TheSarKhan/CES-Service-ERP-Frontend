'use client';

import { useState } from 'react';
import { FileWarning, Gavel, Search, Trash2 } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableTools,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Empty } from '@/components/ui/empty';
import { Alert } from '@/components/ui/alert';
import { Pagination } from '@/components/ui/pagination';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import {
  ClaimStatusBadge,
  CLAIM_RESOLUTION_LABEL,
  CLAIM_STATUS_LABEL,
} from '@/components/inventory/badges';
import { WarrantyClaimDecisionDialog } from '@/components/inventory/WarrantyClaimDecisionDialog';
import { ItemDetailDialog } from '@/components/inventory/ItemDetailDialog';
import { useDeleteWarrantyClaim, useWarrantyClaims } from '@/hooks/use-inventory';
import { formatDate } from '@/lib/utils/format';
import type { WarrantyClaim, WarrantyClaimStatus } from '@/types/inventory';

const PAGE_SIZE = 20;
const COLUMN_COUNT = 6;

const STATUS_OPTIONS: { value: WarrantyClaimStatus | ''; label: string }[] = [
  { value: '', label: 'Bütün tələblər' },
  { value: 'SUBMITTED', label: 'Cavab gözlənilir' },
  { value: 'ACCEPTED', label: 'Qəbul edilib' },
  { value: 'REJECTED', label: 'Rədd edilib' },
  { value: 'RESOLVED', label: 'Bağlanıb' },
];

/**
 * "Zəmanət tələbləri" — the ledger of what was sent to suppliers and what came back.
 *
 * This is where the module's real question gets its answer: an accepted claim means the supplier
 * carried the cost, a rejected one means we did. Without this list a failure record is just a note
 * that something broke.
 */
export function WarrantyClaimsPanel({
  status,
  onStatusChange,
}: {
  status: WarrantyClaimStatus | '';
  onStatusChange: (status: WarrantyClaimStatus | '') => void;
}) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [decisionClaim, setDecisionClaim] = useState<WarrantyClaim | null>(null);
  const [deletingClaim, setDeletingClaim] = useState<WarrantyClaim | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [movedOut, setMovedOut] = useState<WarrantyClaim | null>(null);

  const deleteClaim = useDeleteWarrantyClaim();
  const { data, isLoading, isError } = useWarrantyClaims({
    status: status || undefined,
    search: search || undefined,
    page,
    size: PAGE_SIZE,
  });

  const claims = data?.items ?? [];
  const meta = data?.meta;

  async function handleDelete() {
    if (!deletingClaim) return;
    setActionError(null);
    try {
      await deleteClaim.mutateAsync(deletingClaim.id);
      setDeletingClaim(null);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Tələb silinmədi.');
    }
  }

  return (
    <div>
      <TableTools>
        <div className="tt-left">
          <h3>Zəmanət tələbləri</h3>
          <span className="muted">{meta ? `Cəmi ${meta.total_items}` : 'Yüklənir...'}</span>
        </div>
        <div className="tt-right flex flex-wrap items-center gap-2">
          <Input
            inputSize="sm"
            wrapperClassName="min-w-[220px]"
            placeholder="Seriya/ad, təchizatçı, tələb nömrəsi"
            icon={<Search className="h-4 w-4" />}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
          <select
            className="h-9 rounded-lg border border-line bg-white px-2 text-sm"
            value={status}
            onChange={(e) => {
              onStatusChange(e.target.value as WarrantyClaimStatus | '');
              setPage(1);
            }}
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </TableTools>

      {isError && (
        <Alert variant="danger" title="Yüklənmədi">
          Tələblər yüklənə bilmədi.
        </Alert>
      )}
      {actionError && !deletingClaim && (
        <Alert variant="danger" title="Əməliyyat alınmadı">
          {actionError}
        </Alert>
      )}
      {/* Deciding a claim inside a filtered list makes its row disappear — which reads as the
          record being lost rather than saved. Say what happened and offer the way back to it. */}
      {movedOut && (
        <div className="mb-3">
          <Alert variant="ok" title="Nəticə yazıldı">
            <div className="flex flex-wrap items-center gap-2">
              <span>
                «{movedOut.targetLabel ?? 'Tələb'}» artıq{' '}
                {CLAIM_STATUS_LABEL[movedOut.status].toLowerCase()} — cari süzgəcə düşmür.
              </span>
              <Button
                variant="outline"
                size="xs"
                onClick={() => {
                  onStatusChange('');
                  setMovedOut(null);
                }}
              >
                Bütün tələbləri göstər
              </Button>
            </div>
          </Alert>
        </div>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Hədəf</TableHead>
            <TableHead>Təchizatçı</TableHead>
            <TableHead>Göndərilib</TableHead>
            <TableHead>Nəticə</TableHead>
            <TableHead>Cavab tarixi</TableHead>
            <TableHead className="w-act" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading &&
            Array.from({ length: 4 }).map((_, i) => (
              <TableRow key={`sk-${i}`}>
                {Array.from({ length: COLUMN_COUNT }).map((__, c) => (
                  <TableCell key={`sk-${i}-${c}`}>
                    <span className="skel w-70 block" />
                  </TableCell>
                ))}
              </TableRow>
            ))}

          {!isLoading &&
            !isError &&
            claims.map((claim) => (
              <TableRow
                key={claim.id}
                className={claim.itemId ? 'cursor-pointer' : undefined}
                onClick={() => claim.itemId && setSelectedItemId(claim.itemId)}
              >
                <TableCell>
                  <b className="font-semibold">{claim.targetLabel ?? '—'}</b>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    {claim.targetType === 'INVENTORY_ITEM_UNIT' ? 'Seriyalı vahid' : 'Məhsul'}
                    {claim.claimNumber ? ` · ${claim.claimNumber}` : ''}
                  </div>
                </TableCell>
                <TableCell>
                  <span className={claim.supplier ? undefined : 'text-muted-foreground'}>
                    {claim.supplier || '—'}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="text-muted-foreground">{formatDate(claim.submittedAt)}</span>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <ClaimStatusBadge status={claim.status} />
                    {claim.resolution && (
                      <Badge variant="mute" size="sm">
                        {CLAIM_RESOLUTION_LABEL[claim.resolution]}
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <span className="text-muted-foreground">
                    {claim.decidedAt ? formatDate(claim.decidedAt) : '—'}
                  </span>
                </TableCell>
                <TableCell className="r">
                  <div className="flex items-center justify-end gap-0.5">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDecisionClaim(claim);
                      }}
                      className="btn btn-ghost btn-icon"
                      aria-label="Nəticəni qeyd et"
                      title="Nəticəni qeyd et"
                    >
                      <Gavel className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActionError(null);
                        setDeletingClaim(claim);
                      }}
                      className="btn btn-ghost btn-icon"
                      aria-label="Tələbi sil"
                      title="Sil"
                    >
                      <Trash2 className="h-4 w-4 text-danger" />
                    </button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
        </TableBody>
      </Table>

      {!isLoading && !isError && claims.length === 0 && (
        <Empty
          title="Tələb yoxdur"
          description={
            status || search
              ? 'Bu şərtlərə uyğun tələb tapılmadı.'
              : 'Zəmanət siyahısından «Tələb aç» ilə ilk tələbi qeyd edin.'
          }
          icon={<FileWarning className="mx-auto h-12 w-12" />}
        />
      )}

      {!isLoading && !isError && meta && meta.total_items > 0 && (
        <Pagination
          page={page}
          totalPages={meta.total_pages}
          totalItems={meta.total_items}
          pageSize={meta.size || PAGE_SIZE}
          onPageChange={setPage}
        />
      )}

      <WarrantyClaimDecisionDialog
        open={Boolean(decisionClaim)}
        onOpenChange={(open) => !open && setDecisionClaim(null)}
        claim={decisionClaim}
        onDecided={(saved) => setMovedOut(status && saved.status !== status ? saved : null)}
      />

      <ItemDetailDialog
        open={Boolean(selectedItemId)}
        onOpenChange={(open) => !open && setSelectedItemId(null)}
        itemId={selectedItemId}
      />

      <ConfirmDialog
        open={Boolean(deletingClaim)}
        onOpenChange={(open) => !open && setDeletingClaim(null)}
        title="Tələbi sil"
        description={`“${deletingClaim?.targetLabel ?? ''}” üzrə tələb qeydi silinsin?`}
        confirmLabel="Sil"
        error={actionError}
        loading={deleteClaim.isPending}
        onConfirm={handleDelete}
      />
    </div>
  );
}
