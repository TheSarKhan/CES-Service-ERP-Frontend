'use client';

import { useState } from 'react';
import { ArrowLeft, CheckCircle2, X } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { ApprovalSubmittedDialog } from '@/components/approval/ApprovalSubmittedDialog';
import {
  useCancelStocktake,
  useCloseStocktake,
  useCountStocktakeLine,
  useStocktake,
} from '@/hooks/use-inventory';
import { formatDateTime } from '@/lib/utils/format';
import { cn } from '@/lib/utils';

/**
 * The counting sheet itself.
 *
 * While the sheet is open the recorded quantity is not on screen at all — the server does not even
 * send it. That is the entire point of a blind count: shown the number, people confirm it instead
 * of counting, and the exercise only exists to find the cases where the two differ.
 *
 * Once closed the same screen becomes the variance report.
 */
export function StocktakeSheet({ id, onBack }: { id: string; onBack: () => void }) {
  const { data: sheet, isLoading } = useStocktake(id);
  const countLine = useCountStocktakeLine();
  const closeSheet = useCloseStocktake();
  const cancelSheet = useCancelStocktake();

  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [confirmClose, setConfirmClose] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [sentForApproval, setSentForApproval] = useState(false);

  if (isLoading || !sheet) return <Skeleton className="h-64 w-full" />;

  const isOpen = sheet.status === 'OPEN';

  async function saveCount(itemId: string) {
    const raw = drafts[itemId];
    if (raw === undefined || raw === '') return;
    const value = Number(raw);
    if (!Number.isFinite(value) || value < 0) {
      setError('Düzgün miqdar daxil edin.');
      return;
    }
    setError(null);
    try {
      await countLine.mutateAsync({ id, body: { itemId, countedQuantity: value } });
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[itemId];
        return next;
      });
    } catch {
      setError('Sayım yazılmadı.');
    }
  }

  async function handleClose() {
    setError(null);
    try {
      const result = await closeSheet.mutateAsync(id);
      setConfirmClose(false);
      // No variance means nothing to approve — the sheet just closes, and saying so beats a
      // confirmation dialog about a request that was never created.
      if (result.status === 'PENDING_APPROVAL') setSentForApproval(true);
    } catch {
      setError('Sayım bağlanmadı.');
    }
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
            Geri
          </Button>
          <div>
            <div className="text-base font-bold">{sheet.nodeName}</div>
            <div className="text-xs text-muted-foreground">
              {formatDateTime(sheet.openedAt)} · {sheet.openedByName ?? '—'}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={isOpen ? 'warn' : sheet.status === 'APPLIED' ? 'ok' : 'info'}>
            {isOpen
              ? `Sayılır — ${sheet.countedCount}/${sheet.lineCount}`
              : sheet.status === 'PENDING_APPROVAL'
                ? 'Təsdiq gözləyir'
                : sheet.status === 'APPLIED'
                  ? 'Tətbiq edilib'
                  : 'Ləğv edilib'}
          </Badge>
          {isOpen && (
            <>
              <Button
                variant="primary"
                size="sm"
                disabled={sheet.countedCount === 0}
                onClick={() => setConfirmClose(true)}
              >
                <CheckCircle2 className="h-4 w-4" />
                Sayımı bitir
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setConfirmCancel(true)}>
                <X className="h-4 w-4" />
                Ləğv et
              </Button>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-3">
          <Alert variant="danger" title="Xəta">
            {error}
          </Alert>
        </div>
      )}

      {isOpen && (
        <div className="mb-3">
          <Alert variant="info" title="Kor sayım">
            Sistemdəki miqdar qəsdən göstərilmir — rəfdə nə görürsünüzsə onu yazın. Fərq sayım
            bitəndə hesablanacaq.
          </Alert>
        </div>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Məhsul</TableHead>
            {!isOpen && <TableHead className="r">Sistem</TableHead>}
            <TableHead className="r">Sayılan</TableHead>
            {!isOpen && <TableHead className="r">Fərq</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {sheet.lines.map((line) => {
            const draft = drafts[line.itemId];
            const value = draft ?? (line.countedQuantity === null ? '' : String(line.countedQuantity));
            return (
              <TableRow key={line.itemId}>
                <TableCell>
                  <b className="font-semibold">{line.itemName}</b>
                  <div className="mono text-xs text-muted-foreground">{line.itemSku}</div>
                </TableCell>
                {!isOpen && (
                  <TableCell className="r mono text-muted-foreground">
                    {line.systemQuantity}
                  </TableCell>
                )}
                <TableCell className="r">
                  {isOpen ? (
                    <Input
                      inputSize="sm"
                      type="number"
                      step="0.001"
                      min="0"
                      wrapperClassName="w-[130px] ml-auto"
                      placeholder="—"
                      value={value}
                      onChange={(e) =>
                        setDrafts((prev) => ({ ...prev, [line.itemId]: e.target.value }))
                      }
                      onBlur={() => saveCount(line.itemId)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                      }}
                    />
                  ) : (
                    <span className="mono font-semibold">
                      {line.countedQuantity === null ? 'sayılmayıb' : line.countedQuantity}
                    </span>
                  )}
                </TableCell>
                {!isOpen && (
                  <TableCell className="r">
                    {line.variance === null ? (
                      <span className="text-muted-foreground">—</span>
                    ) : (
                      <span
                        className={cn(
                          'mono font-bold',
                          line.variance === 0
                            ? 'text-muted-foreground'
                            : line.variance > 0
                              ? 'text-ok'
                              : 'text-danger',
                        )}
                      >
                        {line.variance > 0 ? '+' : ''}
                        {line.variance}
                      </span>
                    )}
                  </TableCell>
                )}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      <ConfirmDialog
        open={confirmClose}
        onOpenChange={setConfirmClose}
        title="Sayımı bitir"
        description={
          sheet.countedCount < sheet.lineCount
            ? `${sheet.lineCount - sheet.countedCount} məhsul sayılmayıb — onlara toxunulmayacaq. Fərqlər təsdiqə göndəriləcək.`
            : 'Fərqlər hesablanıb bir sorğu kimi təsdiqə göndəriləcək.'
        }
        confirmLabel="Bitir"
        loading={closeSheet.isPending}
        onConfirm={handleClose}
      />

      <ConfirmDialog
        open={confirmCancel}
        onOpenChange={setConfirmCancel}
        title="Sayımı ləğv et"
        description="Sayılmış rəqəmlər tətbiq olunmayacaq."
        confirmLabel="Ləğv et"
        loading={cancelSheet.isPending}
        onConfirm={async () => {
          await cancelSheet.mutateAsync(id);
          setConfirmCancel(false);
          onBack();
        }}
      />

      <ApprovalSubmittedDialog
        open={sentForApproval}
        onOpenChange={setSentForApproval}
        description="İnventarizasiya fərqləri"
      />
    </div>
  );
}
