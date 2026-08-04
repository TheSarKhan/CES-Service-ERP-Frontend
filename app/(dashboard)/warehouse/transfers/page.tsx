'use client';

import { useState } from 'react';
import { ArrowRight, PackageCheck, Plus, Truck, X } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableTools,
  TableWrap,
} from '@/components/ui/table';
import { Badge, type BadgeVariant } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs } from '@/components/ui/tabs';
import { Empty } from '@/components/ui/empty';
import { Alert } from '@/components/ui/alert';
import { Pagination } from '@/components/ui/pagination';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { TransferSendDialog } from '@/components/inventory/TransferSendDialog';
import { useCancelTransfer, useReceiveTransfer, useTransfers } from '@/hooks/use-inventory';
import { ApiRequestError } from '@/lib/api/client';
import { formatDateTime } from '@/lib/utils/format';
import type { InventoryTransfer, TransferStatus } from '@/types/inventory';

const PAGE_SIZE = 20;

const TABS = [
  { key: 'IN_TRANSIT', label: 'Yolda' },
  { key: 'RECEIVED', label: 'Qəbul edilib' },
  { key: 'CANCELLED', label: 'Ləğv edilib' },
  { key: 'ALL', label: 'Hamısı' },
];

const STATUS_LABEL: Record<TransferStatus, string> = {
  IN_TRANSIT: 'Yolda',
  RECEIVED: 'Qəbul edilib',
  CANCELLED: 'Ləğv edilib',
};

const STATUS_VARIANT: Record<TransferStatus, BadgeVariant> = {
  IN_TRANSIT: 'warn',
  RECEIVED: 'ok',
  CANCELLED: 'mute',
};

/**
 * Transfer — stock moving between folders in two steps.
 *
 * "Yolda" is the tab that matters: everything in it has left one shelf and not yet arrived at
 * another, which is exactly the state a stock count cannot otherwise explain.
 */
export default function WarehouseTransfersPage() {
  const [tab, setTab] = useState('IN_TRANSIT');
  const [page, setPage] = useState(1);
  const [sendOpen, setSendOpen] = useState(false);
  const [cancelling, setCancelling] = useState<InventoryTransfer | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const receiveTransfer = useReceiveTransfer();
  const cancelTransfer = useCancelTransfer();
  const { data, isLoading, isError } = useTransfers(
    tab === 'ALL' ? undefined : (tab as TransferStatus),
    page,
    PAGE_SIZE,
  );

  const transfers = data?.items ?? [];
  const meta = data?.meta;

  async function handleReceive(transfer: InventoryTransfer) {
    setActionError(null);
    try {
      await receiveTransfer.mutateAsync(transfer.id);
    } catch (err) {
      setActionError(
        err instanceof ApiRequestError && err.code === 'TRANSFER_SELF_RECEIPT'
          ? 'Öz göndərdiyiniz transferi özünüz qəbul edə bilməzsiniz.'
          : err instanceof ApiRequestError && err.code === 'TRANSFER_NOT_IN_TRANSIT'
            ? 'Bu transfer artıq qəbul edilib və ya ləğv olunub.'
            : 'Qəbul alınmadı.',
      );
    }
  }

  async function handleCancel() {
    if (!cancelling) return;
    setActionError(null);
    try {
      await cancelTransfer.mutateAsync(cancelling.id);
      setCancelling(null);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Ləğv edilmədi.');
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Transfer</h1>
          <p className="text-sm text-muted-foreground">
            Qovluqlar arası köçürmə — göndər, sonra təyinatda qəbul et
          </p>
        </div>
        <Button variant="primary" onClick={() => setSendOpen(true)}>
          <Plus className="h-4 w-4" />
          Yeni transfer
        </Button>
      </div>

      {isError && (
        <Alert variant="danger" title="Yüklənmədi">
          Transfer siyahısı yüklənə bilmədi.
        </Alert>
      )}
      {actionError && !cancelling && (
        <Alert variant="danger" title="Əməliyyat alınmadı">
          {actionError}
        </Alert>
      )}

      <Tabs
        items={TABS}
        value={tab}
        onChange={(next) => {
          setTab(next);
          setPage(1);
        }}
      />

      <TableWrap>
        <TableTools>
          <div className="tt-left">
            <h3>Transferlər</h3>
            <span className="muted">{meta ? `Cəmi ${meta.total_items}` : 'Yüklənir...'}</span>
          </div>
        </TableTools>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Marşrut</TableHead>
              <TableHead>Məhsullar</TableHead>
              <TableHead>Göndərilib</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-act" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading &&
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={`sk-${i}`}>
                  {Array.from({ length: 5 }).map((__, c) => (
                    <TableCell key={`sk-${i}-${c}`}>
                      <span className="skel w-70 block" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}

            {!isLoading &&
              transfers.map((transfer) => (
                <TableRow key={transfer.id}>
                  <TableCell>
                    <div className="flex flex-wrap items-center gap-1.5 font-semibold">
                      {transfer.fromNodeName ?? 'Qovluq'}
                      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                      {transfer.toNodeName ?? 'Qovluq'}
                    </div>
                    {transfer.notes && (
                      <div className="mt-0.5 text-xs text-muted-foreground">{transfer.notes}</div>
                    )}
                  </TableCell>
                  <TableCell>
                    <ul className="space-y-0.5 text-sm">
                      {transfer.lines.map((line) => (
                        <li key={line.itemId}>
                          {line.itemName}{' '}
                          <span className="mono text-muted-foreground">
                            {line.quantity} {line.unit}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">{formatDateTime(transfer.sentAt)}</div>
                    <div className="text-xs text-muted-foreground">
                      {transfer.sentByName ?? '—'}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANT[transfer.status]}>
                      {STATUS_LABEL[transfer.status]}
                    </Badge>
                    {transfer.status === 'RECEIVED' && transfer.receivedByName && (
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        {transfer.receivedByName}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="r">
                    {transfer.status === 'IN_TRANSIT' && (
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="primary"
                          size="xs"
                          disabled={!transfer.canReceive || receiveTransfer.isPending}
                          title={
                            transfer.canReceive
                              ? undefined
                              : 'Göndərəndən başqa şəxs qəbul etməlidir'
                          }
                          onClick={() => handleReceive(transfer)}
                        >
                          <PackageCheck className="h-3.5 w-3.5" />
                          Qəbul et
                        </Button>
                        <button
                          type="button"
                          onClick={() => {
                            setActionError(null);
                            setCancelling(transfer);
                          }}
                          className="btn btn-ghost btn-icon"
                          aria-label="Transferi ləğv et"
                          title="Ləğv et"
                        >
                          <X className="h-4 w-4 text-danger" />
                        </button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>

        {!isLoading && transfers.length === 0 && (
          <Empty
            title="Transfer yoxdur"
            description={
              tab === 'IN_TRANSIT'
                ? 'Yolda olan transfer yoxdur.'
                : 'Bu statusda transfer tapılmadı.'
            }
            icon={<Truck className="mx-auto h-12 w-12" />}
          />
        )}

        {!isLoading && meta && meta.total_items > PAGE_SIZE && (
          <Pagination
            page={page}
            totalPages={meta.total_pages}
            totalItems={meta.total_items}
            pageSize={meta.size || PAGE_SIZE}
            onPageChange={setPage}
          />
        )}
      </TableWrap>

      <TransferSendDialog open={sendOpen} onOpenChange={setSendOpen} />

      <ConfirmDialog
        open={Boolean(cancelling)}
        onOpenChange={(open) => !open && setCancelling(null)}
        title="Transferi ləğv et"
        description="Miqdar mənbə qovluğa geri qaytarılacaq."
        confirmLabel="Ləğv et"
        error={actionError}
        loading={cancelTransfer.isPending}
        onConfirm={handleCancel}
      />
    </div>
  );
}
