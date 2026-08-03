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
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label, Field, FieldError } from '@/components/ui/label';
import { Alert } from '@/components/ui/alert';
import { DynamicFieldInput } from '@/components/inventory/DynamicFieldInput';
import {
  useCreateInventoryItem,
  useInventoryCategories,
  useInventoryNode,
  useUpdateInventoryItem,
} from '@/hooks/use-inventory';
import { ApiRequestError } from '@/lib/api/client';
import { UNIT_OPTIONS } from '@/lib/constants/units';
import type { InventoryItem } from '@/types/inventory';

const itemFormSchema = z.object({
  categoryId: z.string().min(1, 'Kateqoriya seçin'),
  name: z.string().min(1, 'Ad tələb olunur').max(255),
  sku: z.string().min(1, 'SKU tələb olunur').max(100),
  barcode: z.string().min(1, 'Barkod tələb olunur').max(255),
  unit: z.string().min(1, 'Ölçü vahidi tələb olunur').max(50),
  quantity: z.coerce.number().min(0, 'Mənfi ola bilməz'),
  purchasePrice: z.coerce.number().min(0, 'Mənfi ola bilməz'),
  isSerialized: z.boolean().optional(),
  notes: z.string().max(2000).optional(),
});

type ItemFormValues = z.infer<typeof itemFormSchema>;

export interface ItemFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Node the item is created at (fixed — items move via a dedicated action, not this form). */
  nodeId: string;
  editingItem?: InventoryItem | null;
  /** Pre-selects the category when opened from a specific category section (create only). */
  initialCategoryId?: string;
}

export function ItemFormDialog({
  open,
  onOpenChange,
  nodeId,
  editingItem,
  initialCategoryId,
}: ItemFormDialogProps) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [attributes, setAttributes] = useState<Record<string, unknown>>({});
  const [attributeErrors, setAttributeErrors] = useState<string[]>([]);
  const isEditing = Boolean(editingItem);

  const { data: categories } = useInventoryCategories();
  const { data: node } = useInventoryNode(nodeId);
  const createItem = useCreateInventoryItem();
  const updateItem = useUpdateInventoryItem();

  const availableCategories = useMemo(() => {
    if (!categories) return [];
    const nodeCategoryIds = node?.categoryIds ?? [];
    if (nodeCategoryIds.length === 0) return categories;
    return categories.filter((c) => nodeCategoryIds.includes(c.id));
  }, [categories, node]);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ItemFormValues>({
    resolver: zodResolver(itemFormSchema),
    defaultValues: {
      categoryId: '',
      name: '',
      sku: '',
      barcode: '',
      unit: '',
      quantity: 0,
      purchasePrice: 0,
      isSerialized: false,
      notes: '',
    },
  });

  const selectedCategoryId = watch('categoryId');
  const selectedCategory = useMemo(
    () => categories?.find((c) => c.id === selectedCategoryId) ?? null,
    [categories, selectedCategoryId],
  );

  const currentUnit = watch('unit');
  const unitOptions = useMemo(
    () => (currentUnit && !UNIT_OPTIONS.includes(currentUnit) ? [currentUnit, ...UNIT_OPTIONS] : UNIT_OPTIONS),
    [currentUnit],
  );

  useEffect(() => {
    if (!open) return;
    setServerError(null);
    setAttributeErrors([]);
    if (editingItem) {
      reset({
        categoryId: editingItem.categoryId,
        name: editingItem.name,
        sku: editingItem.sku,
        barcode: editingItem.barcode ?? '',
        unit: editingItem.unit,
        quantity: editingItem.quantity,
        purchasePrice: editingItem.purchasePrice,
        isSerialized: editingItem.isSerialized,
        notes: editingItem.notes ?? '',
      });
      setAttributes(editingItem.attributes ?? {});
    } else {
      const initialCategory = categories?.find((c) => c.id === initialCategoryId);
      reset({
        categoryId: initialCategoryId ?? '',
        name: '',
        sku: '',
        barcode: '',
        unit: initialCategory?.defaultUnit ?? '',
        quantity: 0,
        purchasePrice: 0,
        isSerialized: false,
        notes: '',
      });
      setAttributes({});
    }
  }, [open, editingItem, initialCategoryId, categories, reset]);

  function handleCategoryChange(categoryId: string) {
    const category = categories?.find((c) => c.id === categoryId);
    setAttributes({});
    if (category?.defaultUnit) {
      setValue('unit', category.defaultUnit);
    }
    return category;
  }

  const onSubmit = async (values: ItemFormValues) => {
    setServerError(null);

    const missing = (selectedCategory?.fields ?? [])
      .filter((f) => f.isRequired && (attributes[f.fieldKey] === undefined || attributes[f.fieldKey] === null || attributes[f.fieldKey] === ''))
      .map((f) => f.label);
    if (missing.length > 0) {
      setAttributeErrors(missing);
      return;
    }
    setAttributeErrors([]);

    const body = {
      nodeId,
      categoryId: values.categoryId,
      name: values.name,
      sku: values.sku,
      barcode: values.barcode,
      unit: values.unit,
      quantity: values.quantity,
      purchasePrice: values.purchasePrice,
      isSerialized: values.isSerialized,
      attributes,
      notes: values.notes || null,
    };

    try {
      if (isEditing) {
        await updateItem.mutateAsync({ id: editingItem!.id, body });
      } else {
        await createItem.mutateAsync(body);
      }
      onOpenChange(false);
    } catch (error) {
      if (error instanceof ApiRequestError && error.code === 'DUPLICATE_SKU') {
        setServerError('Bu SKU artıq mövcuddur.');
      } else if (error instanceof ApiRequestError && error.code === 'NODE_CATEGORY_NOT_ALLOWED') {
        setServerError('Seçilmiş kateqoriya bu node üçün icazəli deyil.');
      } else {
        setServerError(error instanceof Error ? error.message : 'Serverlə əlaqə qurulmadı.');
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Məhsulu redaktə et' : 'Yeni məhsul'}</DialogTitle>
        </DialogHeader>

        {serverError && (
          <div className="mb-4">
            <Alert variant="danger" title="Xəta">
              {serverError}
            </Alert>
          </div>
        )}
        {attributeErrors.length > 0 && (
          <div className="mb-4">
            <Alert variant="danger" title="Məcburi sahələr boşdur">
              {attributeErrors.join(', ')}
            </Alert>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="grid grid-cols-2 gap-4">
            <Field>
              <Label htmlFor="item-category" required>
                Kateqoriya
              </Label>
              {isEditing ? (
                <>
                  <select
                    id="item-category"
                    className="h-11 w-full rounded-[11px] border border-line bg-white px-3 text-sm"
                    {...register('categoryId', { onChange: (e) => handleCategoryChange(e.target.value) })}
                  >
                    <option value="">— seçin —</option>
                    {availableCategories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  {node && (node.categoryIds ?? []).length > 0 && (
                    <p className="mt-1.5 text-xs text-muted-foreground">
                      Bu node üçün icazəli kateqoriyalarla məhdudlaşdırılıb.
                    </p>
                  )}
                </>
              ) : (
                <>
                  <input type="hidden" {...register('categoryId')} />
                  <div className="flex h-11 items-center rounded-[11px] border border-line bg-graphite-50 px-3 text-sm font-semibold">
                    {selectedCategory?.name ?? '—'}
                  </div>
                </>
              )}
              {errors.categoryId && <FieldError>{errors.categoryId.message}</FieldError>}
            </Field>
            <Field>
              <Label htmlFor="item-name" required>
                Məhsul adı
              </Label>
              <Input id="item-name" error={Boolean(errors.name)} {...register('name')} />
              {errors.name && <FieldError>{errors.name.message}</FieldError>}
            </Field>

            <Field>
              <Label htmlFor="item-sku" required>
                SKU
              </Label>
              <Input id="item-sku" error={Boolean(errors.sku)} {...register('sku')} />
              {errors.sku && <FieldError>{errors.sku.message}</FieldError>}
            </Field>
            <Field>
              <Label htmlFor="item-barcode" required>
                Barkod
              </Label>
              <Input id="item-barcode" error={Boolean(errors.barcode)} {...register('barcode')} />
              {errors.barcode && <FieldError>{errors.barcode.message}</FieldError>}
            </Field>

            <Field>
              <Label htmlFor="item-unit" required>
                Ölçü vahidi
              </Label>
              <select
                id="item-unit"
                className="h-11 w-full rounded-[11px] border border-line bg-white px-3 text-sm"
                {...register('unit')}
              >
                <option value="">— seçin —</option>
                {unitOptions.map((unit) => (
                  <option key={unit} value={unit}>
                    {unit}
                  </option>
                ))}
              </select>
              {errors.unit && <FieldError>{errors.unit.message}</FieldError>}
            </Field>
            <Field>
              <Label htmlFor="item-price" required>
                Alış qiyməti
              </Label>
              <Input
                id="item-price"
                type="number"
                step="0.01"
                error={Boolean(errors.purchasePrice)}
                {...register('purchasePrice')}
              />
              {errors.purchasePrice && <FieldError>{errors.purchasePrice.message}</FieldError>}
            </Field>

            <Field>
              <Label htmlFor="item-qty" required>
                Miqdar (başlanğıc)
              </Label>
              <Input
                id="item-qty"
                type="number"
                step="0.001"
                disabled={isEditing}
                error={Boolean(errors.quantity)}
                {...register('quantity')}
              />
              {errors.quantity && <FieldError>{errors.quantity.message}</FieldError>}
            </Field>
            <Field className="flex items-end pb-2">
              <Checkbox disabled={isEditing} {...register('isSerialized')}>
                Seriya nömrəli / zəmanətli (fərdi vahidlər)
              </Checkbox>
            </Field>
          </div>

          {selectedCategory &&
            selectedCategory.fields!
              .filter((f) => f.isVisible)
              .map((field) => (
                <Field key={field.id} className="mt-2">
                  <Label required={field.isRequired}>{field.label}</Label>
                  <DynamicFieldInput
                    field={field}
                    value={attributes[field.fieldKey]}
                    onChange={(value) => setAttributes((prev) => ({ ...prev, [field.fieldKey]: value }))}
                  />
                </Field>
              ))}

          <Field className="mt-2">
            <Label htmlFor="item-notes">Qeyd</Label>
            <Textarea id="item-notes" {...register('notes')} />
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
  );
}
