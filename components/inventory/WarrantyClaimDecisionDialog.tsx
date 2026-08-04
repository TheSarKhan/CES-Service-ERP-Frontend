'use client';

import { useEffect, useState } from 'react';
import { Gavel } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label, Field, FieldHint } from '@/components/ui/label';
import { Alert } from '@/components/ui/alert';
import { useDecideWarrantyClaim } from '@/hooks/use-inventory';
import { CLAIM_RESOLUTION_LABEL } from '@/components/inventory/badges';
import { cn } from '@/lib/utils';
import type {
  WarrantyClaim,
  WarrantyClaimResolution,
  WarrantyClaimStatus,
} from '@/types/inventory';

function todayValue(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** The three answers a supplier can give, phrased by their commercial consequence. */
const OUTCOMES: { value: WarrantyClaimStatus; label: string; hint: string; tone: string }[] = [
  {
    value: 'ACCEPTED',
    label: 'Qəbul edildi',
    hint: 'Xərc təchizatçının üzərindədir',
    tone: 'border-ok bg-ok/5',
  },
  {
    value: 'REJECTED',
    label: 'Rədd edildi',
    hint: 'Xərc bizim üzərimizdədir',
    tone: 'border-danger bg-danger/5',
  },
  {
    value: 'RESOLVED',
    label: 'Bağlandı',
    hint: 'Əvəzləmə / təmir faktiki tamamlandı',
    tone: 'border-info bg-info/5',
  },
];

const RESOLUTIONS: WarrantyClaimResolution[] = ['REPLACED', 'REPAIRED', 'REFUNDED', 'NONE'];

/** Records the supplier's answer — the moment the module finally says who pays. */
export function WarrantyClaimDecisionDialog({
  open,
  onOpenChange,
  claim,
  initialStatus,
  onDecided,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  claim: WarrantyClaim | null;
  /**
   * Preselects an outcome — set when the dialog was opened by dropping a card on a column, so the
   * board's gesture is already half the answer and only the details are left to fill in.
   */
  initialStatus?: WarrantyClaimStatus;
  /** Receives the saved claim — the caller may need to react to it leaving the current filter. */
  onDecided?: (claim: WarrantyClaim) => void;
}) {
  const [status, setStatus] = useState<WarrantyClaimStatus>('ACCEPTED');
  const [resolution, setResolution] = useState<WarrantyClaimResolution | ''>('');
  const [decisionNotes, setDecisionNotes] = useState('');
  const [decidedAt, setDecidedAt] = useState(todayValue());
  const [error, setError] = useState<string | null>(null);
  const decide = useDecideWarrantyClaim();

  useEffect(() => {
    if (!open || !claim) return;
    setStatus(initialStatus ?? (claim.status === 'SUBMITTED' ? 'ACCEPTED' : claim.status));
    setResolution(claim.resolution ?? '');
    setDecisionNotes(claim.decisionNotes ?? '');
    setDecidedAt(claim.decidedAt ?? todayValue());
    setError(null);
  }, [open, claim, initialStatus]);

  async function handleSubmit() {
    if (!claim) return;
    setError(null);
    try {
      const saved = await decide.mutateAsync({
        id: claim.id,
        body: {
          status,
          resolution: resolution || null,
          decisionNotes: decisionNotes.trim() || null,
          decidedAt: decidedAt || null,
        },
      });
      onDecided?.(saved);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nəticə yazılmadı.');
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Tələbin nəticəsi</DialogTitle>
          <DialogDescription>
            {claim?.targetLabel ?? ''}
            {claim?.supplier ? ` · ${claim.supplier}` : ''}
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
          <Label>Təchizatçının cavabı</Label>
          <div className="space-y-1.5">
            {OUTCOMES.map((outcome) => (
              <button
                key={outcome.value}
                type="button"
                onClick={() => setStatus(outcome.value)}
                className={cn(
                  'flex w-full items-baseline gap-2 rounded-lg border border-line px-3 py-2.5 text-left transition-colors hover:bg-graphite-50',
                  status === outcome.value && outcome.tone,
                )}
              >
                <span className="font-semibold">{outcome.label}</span>
                <span className="text-xs text-muted-foreground">{outcome.hint}</span>
              </button>
            ))}
          </div>
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field className="mb-0">
            <Label htmlFor="decision-resolution">Həll forması</Label>
            <select
              id="decision-resolution"
              className="h-10 w-full rounded-[11px] border border-line bg-white px-3 text-sm"
              value={resolution}
              onChange={(e) => setResolution(e.target.value as WarrantyClaimResolution | '')}
            >
              <option value="">Seçilməyib</option>
              {RESOLUTIONS.map((value) => (
                <option key={value} value={value}>
                  {CLAIM_RESOLUTION_LABEL[value]}
                </option>
              ))}
            </select>
          </Field>
          <Field className="mb-0">
            <Label htmlFor="decision-date">Cavab tarixi</Label>
            <Input
              id="decision-date"
              type="date"
              value={decidedAt}
              onChange={(e) => setDecidedAt(e.target.value)}
            />
          </Field>
        </div>

        <Field className="mt-4">
          <Label htmlFor="decision-notes">Qeyd</Label>
          <Textarea
            id="decision-notes"
            rows={3}
            value={decisionNotes}
            onChange={(e) => setDecisionNotes(e.target.value)}
          />
          <FieldHint>Rədd cavabının səbəbi burada qalır — növbəti alışda lazım olur.</FieldHint>
        </Field>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Ləğv et
          </Button>
          <Button type="button" variant="primary" loading={decide.isPending} onClick={handleSubmit}>
            <Gavel className="h-4 w-4" />
            Yadda saxla
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
