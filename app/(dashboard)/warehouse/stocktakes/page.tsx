'use client';

import { useState } from 'react';
import { ClipboardList, Plus } from 'lucide-react';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { NodeTree } from '@/components/inventory/NodeTree';
import { StocktakeSheet } from '@/components/inventory/StocktakeSheet';
import { useOpenStocktake, useStocktakes } from '@/hooks/use-inventory';
import { ApiRequestError } from '@/lib/api/client';
import { formatDateTime } from '@/lib/utils/format';
import type { StocktakeStatus } from '@/types/inventory';

const PAGE_SIZE = 20;

const TABS = [
  { key: 'OPEN', label: 'Sayılır' },
  { key: 'PENDING_APPROVAL', label: 'Təsdiq gözləyir' },
  { key: 'APPLIED', label: 'Tətbiq edilib' },
  { key: 'ALL', label: 'Hamısı' },
];

const STATUS_LABEL: Record<StocktakeStatus, string> = {
  OPEN: 'Sayılır',
  PENDING_APPROVAL: 'Təsdiq gözləyir',
  APPLIED: 'Tətbiq edilib',
  CANCELLED: 'Ləğv edilib',
};

const STATUS_VARIANT: Record<StocktakeStatus, BadgeVariant> = {
  OPEN: 'warn',
  PENDING_APPROVAL: 'info',
  APPLIED: 'ok',
  CANCELLED: 'mute',
};

/**
 * İnventarizasiya — one folder per sheet.
 *
 * A sheet matches what one person can walk in one go; counting a whole warehouse as a single
 * document is how counts end up half-finished and abandoned.
 */
export default function WarehouseStocktakesPage() {
  const [tab, setTab] = useState('OPEN');
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openStocktake = useOpenStocktake();
  const { data, isLoading, isError } = useStocktakes(
    tab === 'ALL' ? undefined : (tab as StocktakeStatus),
    page,
    PAGE_SIZE,
  );

  const sheets = data?.items ?? [];
  const meta = data?.meta;

  async function handlePickFolder(nodeId: string) {
    setError(null);
    try {
      const created = await openStocktake.mutateAsync({ nodeId });
      setPickerOpen(false);
      setSelectedId(created.id);
    } catch (err) {
      setError(
        err instanceof ApiRequestError && err.code === 'STOCKTAKE_ALREADY_OPEN'
          ? 'Bu qovluqda artıq gedən sayım var — əvvəlcə onu bitirin.'
          : 'Sayım başladıla bilmədi.',
      );
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">İnventarizasiya</h1>
          <p className="text-sm text-muted-foreground">
            Kor sayım — rəfdə görünən yazılır, fərq sonda hesablanır
          </p>
        </div>
        {!selectedId && (
          <Button variant="primary" onClick={() => setPickerOpen(true)}>
            <Plus className="h-4 w-4" />
            Sayıma başla
          </Button>
        )}
      </div>

      {error && (
        <Alert variant="danger" title="Xəta">
          {error}
        </Alert>
      )}

      {selectedId ? (
        <TableWrap className="p-4">
          <StocktakeSheet id={selectedId} onBack={() => setSelectedId(null)} />
        </TableWrap>
      ) : (
        <>
          <Tabs
            items={TABS}
            value={tab}
            onChange={(next) => {
              setTab(next);
              setPage(1);
            }}
          />

          {isError && (
            <Alert variant="danger" title="Yüklənmədi">
              Sayım siyahısı yüklənə bilmədi.
            </Alert>
          )}

          <TableWrap>
            <TableTools>
              <div className="tt-left">
                <h3>Sayımlar</h3>
                <span className="muted">{meta ? `Cəmi ${meta.total_items}` : 'Yüklənir...'}</span>
              </div>
            </TableTools>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Qovluq</TableHead>
                  <TableHead>Başlanıb</TableHead>
                  <TableHead className="r">Sayılıb</TableHead>
                  <TableHead className="r">Fərqli</TableHead>
                  <TableHead>Status</TableHead>
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
                  sheets.map((sheet) => (
                    <TableRow
                      key={sheet.id}
                      className="cursor-pointer"
                      onClick={() => setSelectedId(sheet.id)}
                    >
                      <TableCell>
                        <b className="font-semibold">{sheet.nodeName}</b>
                        {sheet.notes && (
                          <div className="text-xs text-muted-foreground">{sheet.notes}</div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{formatDateTime(sheet.openedAt)}</div>
                        <div className="text-xs text-muted-foreground">
                          {sheet.openedByName ?? '—'}
                        </div>
                      </TableCell>
                      <TableCell className="r mono">
                        {sheet.countedCount}/{sheet.lineCount}
                      </TableCell>
                      <TableCell className="r mono">
                        {sheet.status === 'OPEN' ? (
                          <span className="text-muted-foreground">gizli</span>
                        ) : (
                          sheet.varianceCount
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={STATUS_VARIANT[sheet.status]}>
                          {STATUS_LABEL[sheet.status]}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>

            {!isLoading && sheets.length === 0 && (
              <Empty
                title="Sayım yoxdur"
                description={
                  tab === 'OPEN'
                    ? 'Gedən sayım yoxdur — «Sayıma başla» ilə qovluq seçin.'
                    : 'Bu statusda sayım tapılmadı.'
                }
                icon={<ClipboardList className="mx-auto h-12 w-12" />}
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
        </>
      )}

      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Sayıma başla</DialogTitle>
            <DialogDescription>
              Hansı qovluq sayılacaq? Vərəq həmin qovluqdakı bütün məhsulları əhatə edir.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[400px] overflow-y-auto rounded-lg border border-line p-2">
            <NodeTree mode="browse" onRowClick={(node) => handlePickFolder(node.id)} />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
