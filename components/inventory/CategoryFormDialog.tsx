'use client';

import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label, Field, FieldError } from '@/components/ui/label';
import { Alert } from '@/components/ui/alert';
import { useCreateInventoryCategory, useUpdateInventoryCategory } from '@/hooks/use-inventory';
import { ApiRequestError } from '@/lib/api/client';
import { UNIT_OPTIONS } from '@/lib/constants/units';
import { ApprovalSubmittedDialog } from '@/components/approval/ApprovalSubmittedDialog';
import type { InventoryCategory } from '@/types/inventory';

const categoryFormSchema = z.object({
  name: z.string().min(1, 'Ad tələb olunur').max(255),
  defaultUnit: z.string().min(1, 'Ölçü vahidi tələb olunur').max(50),
});

type CategoryFormValues = z.infer<typeof categoryFormSchema>;

export interface CategoryFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When set, edits this category's core fields (name/unit) — the field schema is managed separately. */
  editingCategory?: InventoryCategory | null;
}

export function CategoryFormDialog({ open, onOpenChange, editingCategory }: CategoryFormDialogProps) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [approvalSent, setApprovalSent] = useState(false);
  const isEditing = Boolean(editingCategory);
  const createCategory = useCreateInventoryCategory();
  const updateCategory = useUpdateInventoryCategory();

  const unitOptions = useMemo(() => {
    if (editingCategory?.defaultUnit && !UNIT_OPTIONS.includes(editingCategory.defaultUnit)) {
      return [editingCategory.defaultUnit, ...UNIT_OPTIONS];
    }
    return UNIT_OPTIONS;
  }, [editingCategory]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: { name: '', defaultUnit: '' },
  });

  useEffect(() => {
    if (open) {
      reset({
        name: editingCategory?.name ?? '',
        defaultUnit: editingCategory?.defaultUnit ?? '',
      });
      setServerError(null);
    }
  }, [open, editingCategory, reset]);

  const onSubmit = async (values: CategoryFormValues) => {
    setServerError(null);
    try {
      if (isEditing) {
        // Deferred: editing a category reshapes every product filed under it, so it's reviewed.
        await updateCategory.mutateAsync({
          id: editingCategory!.id,
          body: { name: values.name, defaultUnit: values.defaultUnit, isActive: editingCategory!.isActive },
        });
        onOpenChange(false);
        setApprovalSent(true);
        return;
      }
      await createCategory.mutateAsync({ name: values.name, defaultUnit: values.defaultUnit });
      onOpenChange(false);
    } catch (error) {
      if (error instanceof ApiRequestError && error.code === 'ENTITY_PENDING_APPROVAL') {
        setServerError('Bu kateqoriyanın təsdiq gözləyən dəyişikliyi var — əvvəlcə o qərara alınmalıdır.');
      } else if (error instanceof ApiRequestError && error.code === 'DUPLICATE_CATEGORY_NAME') {
        setServerError('Bu adda kateqoriya artıq mövcuddur.');
      } else {
        setServerError(error instanceof Error ? error.message : 'Serverlə əlaqə qurulmadı.');
      }
    }
  };

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Kateqoriyanı redaktə et' : 'Yeni kateqoriya'}</DialogTitle>
        </DialogHeader>

        {serverError && (
          <div className="mb-4">
            <Alert variant="danger" title="Xəta">
              {serverError}
            </Alert>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <Field>
            <Label htmlFor="cat-name" required>
              Ad
            </Label>
            <Input id="cat-name" placeholder="Elektronika" error={Boolean(errors.name)} {...register('name')} />
            {errors.name && <FieldError>{errors.name.message}</FieldError>}
          </Field>
          <Field>
            <Label htmlFor="cat-unit" required>
              Default ölçü vahidi
            </Label>
            <select
              id="cat-unit"
              className="h-11 w-full rounded-[11px] border border-line bg-white px-3 text-sm"
              {...register('defaultUnit')}
            >
              <option value="">— seçin —</option>
              {unitOptions.map((unit) => (
                <option key={unit} value={unit}>
                  {unit}
                </option>
              ))}
            </select>
            {errors.defaultUnit && <FieldError>{errors.defaultUnit.message}</FieldError>}
          </Field>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Ləğv et
            </Button>
            <Button type="submit" variant="primary" loading={isSubmitting}>
              Yadda saxla
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
    <ApprovalSubmittedDialog
      open={approvalSent}
      onOpenChange={setApprovalSent}
      description="Kateqoriya redaktəsi"
    />
    </>
  );
}
