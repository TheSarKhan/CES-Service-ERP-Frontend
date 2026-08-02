'use client';

import { useState } from 'react';
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
import { useCreateInventoryItemUnitBatch } from '@/hooks/use-inventory';
import { ApiRequestError } from '@/lib/api/client';
import type { InventoryItem } from '@/types/inventory';

export interface UnitBatchRegisterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: InventoryItem | null;
}

/** Registers a batch of serialized units for one item — e.g. 50 batteries bought together. */
export function UnitBatchRegisterDialog({ open, onOpenChange, item }: UnitBatchRegisterDialogProps) {
  const [serialsText, setSerialsText] = useState('');
  const [purchaseDate, setPurchaseDate] = useState('');
  const [warrantyStartDate, setWarrantyStartDate] = useState('');
  const [warrantyEndDate, setWarrantyEndDate] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const createBatch = useCreateInventoryItemUnitBatch();

  if (!item) return null;

  async function handleSubmit() {
    setError(null);
    const serialNumbers = serialsText
      .split(/[\n,]/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (serialNumbers.length === 0) {
      setError('Ən azı bir seriya nömrəsi daxil edin.');
      return;
    }
    try {
      await createBatch.mutateAsync({
        itemId: item!.id,
        body: {
          serialNumbers,
          purchaseDate: purchaseDate || undefined,
          warrantyStartDate: warrantyStartDate || undefined,
          warrantyEndDate: warrantyEndDate || undefined,
          notes: notes || undefined,
        },
      });
      setSerialsText('');
      setNotes('');
      onOpenChange(false);
    } catch (err) {
      setError(
        err instanceof ApiRequestError && err.code === 'DUPLICATE_SERIAL_NUMBER'
          ? 'Siyahıda təkrarlanan və ya artıq mövcud olan seriya nömrəsi var.'
          : 'Qeydiyyat alınmadı.',
      );
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{item.name} — partiya qeydiyyatı</DialogTitle>
          <DialogDescription>Hər sətirdə/vergüldən sonra bir seriya nömrəsi</DialogDescription>
        </DialogHeader>

        {error && (
          <div className="mb-3">
            <Alert variant="danger" title="Xəta">
              {error}
            </Alert>
          </div>
        )}

        <Field>
          <Label required>Seriya nömrələri</Label>
          <Textarea
            rows={5}
            placeholder={'BATT-SN-001\nBATT-SN-002\nBATT-SN-003'}
            value={serialsText}
            onChange={(e) => setSerialsText(e.target.value)}
          />
          <FieldHint>{serialsText.split(/[\n,]/).map((s) => s.trim()).filter(Boolean).length} vahid</FieldHint>
        </Field>

        <div className="grid grid-cols-3 gap-3">
          <Field>
            <Label>Alış tarixi</Label>
            <Input type="date" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} />
          </Field>
          <Field>
            <Label>Zəmanət başlanğıcı</Label>
            <Input type="date" value={warrantyStartDate} onChange={(e) => setWarrantyStartDate(e.target.value)} />
          </Field>
          <Field>
            <Label>Zəmanət bitmə tarixi</Label>
            <Input type="date" value={warrantyEndDate} onChange={(e) => setWarrantyEndDate(e.target.value)} />
          </Field>
        </div>

        <Field>
          <Label>Qeyd</Label>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Ləğv et
          </Button>
          <Button type="button" variant="primary" loading={createBatch.isPending} onClick={handleSubmit}>
            Qeydə al
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
