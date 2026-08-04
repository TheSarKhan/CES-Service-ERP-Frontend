'use client';

import { useEffect, useState } from 'react';
import { FileWarning } from 'lucide-react';
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
import { useCreateWarrantyClaim } from '@/hooks/use-inventory';
import type { WarrantyTargetType } from '@/types/inventory';

/** Today as `yyyy-mm-dd` for the date input's default. */
function todayValue(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/**
 * "Zəmanət tələbi aç" — records that a claim went to the supplier.
 *
 * Unlike extending a warranty this isn't queued for approval: it documents something that already
 * happened outside the system, and holding the record behind a second signature would only mean
 * the paperwork lags the phone call.
 */
export function WarrantyClaimDialog({
  open,
  onOpenChange,
  targetType,
  targetId,
  targetLabel,
  defaultSupplier,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetType: WarrantyTargetType;
  targetId: string;
  /** Serial number or product name — shown so nobody files against the wrong thing. */
  targetLabel: string;
  defaultSupplier?: string | null;
  onCreated?: () => void;
}) {
  const [supplier, setSupplier] = useState('');
  const [claimNumber, setClaimNumber] = useState('');
  const [description, setDescription] = useState('');
  const [submittedAt, setSubmittedAt] = useState(todayValue());
  const [error, setError] = useState<string | null>(null);
  const createClaim = useCreateWarrantyClaim();

  useEffect(() => {
    if (!open) return;
    setSupplier(defaultSupplier ?? '');
    setClaimNumber('');
    setDescription('');
    setSubmittedAt(todayValue());
    setError(null);
  }, [open, defaultSupplier]);

  async function handleSubmit() {
    setError(null);
    try {
      await createClaim.mutateAsync({
        targetType,
        targetId,
        supplier: supplier.trim() || null,
        claimNumber: claimNumber.trim() || null,
        description: description.trim() || null,
        submittedAt: submittedAt || null,
      });
      onCreated?.();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Tələb qeydə alınmadı.');
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Zəmanət tələbi aç</DialogTitle>
          <DialogDescription>
            {targetLabel} üçün təchizatçıya göndərilən tələbi qeyd edin
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
          <Label htmlFor="claim-supplier">Təchizatçı</Label>
          <Input
            id="claim-supplier"
            value={supplier}
            onChange={(e) => setSupplier(e.target.value)}
            placeholder="Məsələn: Bosch Rexroth"
          />
          <FieldHint>Məhsulun təchizatçısı avtomatik yazılıb — lazım olsa dəyişin.</FieldHint>
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field className="mb-0">
            <Label htmlFor="claim-number">Tələb nömrəsi</Label>
            <Input
              id="claim-number"
              value={claimNumber}
              onChange={(e) => setClaimNumber(e.target.value)}
              placeholder="Təchizatçının istinadı"
            />
          </Field>
          <Field className="mb-0">
            <Label htmlFor="claim-date">Göndərilmə tarixi</Label>
            <Input
              id="claim-date"
              type="date"
              value={submittedAt}
              onChange={(e) => setSubmittedAt(e.target.value)}
            />
          </Field>
        </div>

        <Field className="mt-4">
          <Label htmlFor="claim-desc">Nasazlığın təsviri</Label>
          <Textarea
            id="claim-desc"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Nə baş verdi, nə tələb olunur"
          />
        </Field>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Ləğv et
          </Button>
          <Button
            type="button"
            variant="primary"
            loading={createClaim.isPending}
            onClick={handleSubmit}
          >
            <FileWarning className="h-4 w-4" />
            Tələbi qeyd et
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
