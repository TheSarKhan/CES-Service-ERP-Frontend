'use client';

import { useEffect, useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label, Field, FieldHint } from '@/components/ui/label';
import { Alert } from '@/components/ui/alert';
import { useExtendWarranty } from '@/hooks/use-inventory';
import { ApiRequestError } from '@/lib/api/client';
import { formatDate } from '@/lib/utils/format';
import { cn } from '@/lib/utils';
import { ApprovalSubmittedDialog } from '@/components/approval/ApprovalSubmittedDialog';

const QUICK_MONTHS = [3, 6, 12, 24];

/**
 * "Zəmanəti uzat" — adds months to the current end date, or sets an absolute one.
 *
 * The extension isn't applied here: moving a warranty date decides who pays for a repair, so it
 * goes through the approval queue like every other consequential change.
 */
export function WarrantyExtendDialog({
  open,
  onOpenChange,
  target,
  id,
  label,
  currentEndDate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  target: 'item' | 'unit';
  id: string;
  label: string;
  currentEndDate: string | null;
}) {
  const [months, setMonths] = useState<number | null>(12);
  const [newEndDate, setNewEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [approvalSent, setApprovalSent] = useState(false);
  const extend = useExtendWarranty(target);

  useEffect(() => {
    if (open) {
      setMonths(12);
      setNewEndDate('');
      setReason('');
      setError(null);
    }
  }, [open]);

  async function handleSubmit() {
    setError(null);
    if (!newEndDate && (!months || months <= 0)) {
      setError('Ay sayı və ya yeni bitmə tarixi göstərin.');
      return;
    }
    try {
      await extend.mutateAsync({
        id,
        // An explicit date wins; otherwise the server adds the months to whichever is later,
        // the current end date or today — so extending an expired warranty really extends it.
        body: newEndDate
          ? { newEndDate, reason: reason || undefined }
          : { months: months as number, reason: reason || undefined },
      });
      onOpenChange(false);
      setApprovalSent(true);
    } catch (err) {
      setError(
        err instanceof ApiRequestError && err.code === 'ENTITY_PENDING_APPROVAL'
          ? 'Bu qeydin təsdiq gözləyən dəyişikliyi var — əvvəlcə o qərara alınmalıdır.'
          : err instanceof ApiRequestError && err.code === 'ITEM_IS_SERIALIZED'
            ? 'Bu seriyalı məhsuldur — zəmanət hər vahidin üzərindən uzadılır.'
            : 'Uzatma göndərilmədi.',
      );
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Zəmanəti uzat</DialogTitle>
            <DialogDescription>
              {label} · cari bitmə: {formatDate(currentEndDate)}
            </DialogDescription>
          </DialogHeader>

          {error && (
            <div className="mb-3">
              <Alert variant="danger" title="Xəta">
                {error}
              </Alert>
            </div>
          )}

          <Field>
            <Label>Nə qədər uzadılsın?</Label>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_MONTHS.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => {
                    setMonths(m);
                    setNewEndDate('');
                  }}
                  className={cn(
                    'rounded-full border border-line px-3 py-1.5 text-sm font-semibold transition-colors',
                    !newEndDate && months === m
                      ? 'border-gold bg-gold-50 text-gold'
                      : 'hover:bg-graphite-50',
                  )}
                >
                  +{m} ay
                </button>
              ))}
            </div>
          </Field>

          <Field>
            <Label htmlFor="warranty-months">Ay sayı</Label>
            <Input
              id="warranty-months"
              type="number"
              min="1"
              value={months ?? ''}
              disabled={Boolean(newEndDate)}
              onChange={(e) => setMonths(e.target.value === '' ? null : Number(e.target.value))}
            />
          </Field>

          <Field>
            <Label htmlFor="warranty-new-end">...yaxud dəqiq bitmə tarixi</Label>
            <Input
              id="warranty-new-end"
              type="date"
              value={newEndDate}
              onChange={(e) => setNewEndDate(e.target.value)}
            />
            <FieldHint>Doldurulsa, ay sayı nəzərə alınmır.</FieldHint>
          </Field>

          <Field>
            <Label htmlFor="warranty-reason">Səbəb</Label>
            <Textarea
              id="warranty-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Təchizatçı zəmanəti uzatdı..."
            />
            <FieldHint>Tarixçədə saxlanılır — sonradan «niyə uzadılıb» sualı cavablanır.</FieldHint>
          </Field>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Ləğv et
            </Button>
            <Button type="button" variant="primary" loading={extend.isPending} onClick={handleSubmit}>
              <ShieldCheck className="h-4 w-4" />
              Təsdiqə göndər
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ApprovalSubmittedDialog
        open={approvalSent}
        onOpenChange={setApprovalSent}
        description="Zəmanətin uzadılması"
      />
    </>
  );
}
