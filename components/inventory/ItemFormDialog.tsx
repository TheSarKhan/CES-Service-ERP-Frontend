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
import { ShieldCheck } from 'lucide-react';
import { Label, Field, FieldError, FieldHint } from '@/components/ui/label';
import { Alert } from '@/components/ui/alert';
import { DynamicFieldInput } from '@/components/inventory/DynamicFieldInput';
import {
  useCreateInventoryItem,
  useInventoryCategories,
  useUpdateInventoryItem,
} from '@/hooks/use-inventory';
import { ApiRequestError } from '@/lib/api/client';
import { UNIT_OPTIONS } from '@/lib/constants/units';
import { ApprovalSubmittedDialog } from '@/components/approval/ApprovalSubmittedDialog';
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
  // Empty string -> undefined so an untouched warranty field stays null rather than becoming 0.
  warrantyMonths: z.preprocess(
    (v) => (v === '' || v === null ? undefined : v),
    z.coerce.number().int().min(0, 'Mənfi ola bilməz').optional(),
  ),
  warrantyStartDate: z.string().optional(),
  warrantyEndDate: z.string().optional(),
  supplier: z.string().max(255).optional(),
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
  const [approvalSent, setApprovalSent] = useState(false);
  const [attributes, setAttributes] = useState<Record<string, unknown>>({});
  const [attributeErrors, setAttributeErrors] = useState<string[]>([]);
  const isEditing = Boolean(editingItem);

  const { data: categories } = useInventoryCategories();
  const createItem = useCreateInventoryItem();
  const updateItem = useUpdateInventoryItem();

  const {
    register,
    handleSubmit,
    watch,
    reset,
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
      warrantyMonths: undefined,
      warrantyStartDate: '',
      warrantyEndDate: '',
      supplier: '',
      notes: '',
    },
  });

  const selectedCategoryId = watch('categoryId');
  const selectedCategory = useMemo(
    () => categories?.find((c) => c.id === selectedCategoryId) ?? null,
    [categories, selectedCategoryId],
  );

  const watchIsSerialized = watch('isSerialized');
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
        warrantyMonths: editingItem.warrantyMonths ?? undefined,
        warrantyStartDate: editingItem.warrantyStartDate ?? '',
        warrantyEndDate: editingItem.warrantyEndDate ?? '',
        supplier: editingItem.supplier ?? '',
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
        warrantyMonths: undefined,
        warrantyStartDate: '',
        warrantyEndDate: '',
        supplier: '',
        notes: '',
      });
      setAttributes({});
    }
  }, [open, editingItem, initialCategoryId, categories, reset]);

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
      warrantyMonths: values.warrantyMonths ?? null,
      warrantyStartDate: values.warrantyStartDate || null,
      warrantyEndDate: values.warrantyEndDate || null,
      supplier: values.supplier || null,
      notes: values.notes || null,
    };

    try {
      if (isEditing) {
        // Deferred: the edit is parked for approval, so the form closes onto a confirmation
        // rather than an updated record.
        await updateItem.mutateAsync({ id: editingItem!.id, body });
        onOpenChange(false);
        setApprovalSent(true);
        return;
      }
      await createItem.mutateAsync(body);
      onOpenChange(false);
    } catch (error) {
      if (error instanceof ApiRequestError && error.code === 'DUPLICATE_SKU') {
        setServerError('Bu SKU artıq mövcuddur.');
      } else if (error instanceof ApiRequestError && error.code === 'ENTITY_PENDING_APPROVAL') {
        setServerError('Bu məhsulun təsdiq gözləyən dəyişikliyi var — əvvəlcə o qərara alınmalıdır.');
      } else if (error instanceof ApiRequestError && error.code === 'NODE_CATEGORY_NOT_ALLOWED') {
        setServerError('Seçilmiş kateqoriya bu qovluq üçün icazəli deyil.');
      } else {
        setServerError(error instanceof Error ? error.message : 'Serverlə əlaqə qurulmadı.');
      }
    }
  };

  return (
    <>
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
              {/* Fixed permanently — including while editing — so an item can never end up
                  listed under a category section it doesn't actually belong to. Recategorizing
                  a product means creating it fresh under the right category, not relabeling it. */}
              <input type="hidden" {...register('categoryId')} />
              <div className="flex h-11 items-center rounded-[11px] border border-line bg-graphite-50 px-3 text-sm font-semibold">
                {selectedCategory?.name ?? '—'}
              </div>
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

          {/* Warranty means two different things depending on the item, so the copy changes with
              it: on a serialized item the months are only a default for its units, which each
              carry their own dates. */}
          <div className="mt-2 rounded-lg border border-line p-3">
            <div className="mb-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5 text-gold" />
              Zəmanət
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field className="mb-0">
                <Label htmlFor="item-warranty-months">Müddət (ay)</Label>
                <Input
                  id="item-warranty-months"
                  type="number"
                  min="0"
                  placeholder="12"
                  error={Boolean(errors.warrantyMonths)}
                  {...register('warrantyMonths')}
                />
                {errors.warrantyMonths ? (
                  <FieldError>{errors.warrantyMonths.message}</FieldError>
                ) : (
                  <FieldHint>
                    {watchIsSerialized
                      ? 'Yeni seriya nömrəsi qeydə alınanda zəmanət bu müddətdən hesablanacaq.'
                      : 'Başlanğıc tarixdən etibarən. Bitmə tarixi boşdursa buradan hesablanır.'}
                  </FieldHint>
                )}
              </Field>
              <Field className="mb-0">
                <Label htmlFor="item-warranty-start">Başlanğıc tarixi</Label>
                <Input id="item-warranty-start" type="date" {...register('warrantyStartDate')} />
              </Field>
              {!watchIsSerialized && (
                <Field className="mb-0">
                  <Label htmlFor="item-warranty-end">Bitmə tarixi</Label>
                  <Input id="item-warranty-end" type="date" {...register('warrantyEndDate')} />
                  <FieldHint>Yazılsa, müddətdən hesablanan tarixi əvəz edir.</FieldHint>
                </Field>
              )}
            </div>
            {watchIsSerialized && (
              <p className="mt-2 text-xs text-muted-foreground">
                Seriyalı məhsulda zəmanət hər vahidin üzərindədir — bitmə tarixi vahid səviyyəsində
                saxlanılır və ayrıca dəyişdirilə bilər.
              </p>
            )}

            {/* Its own field rather than a category attribute: a warranty claim is addressed to a
                supplier, so the warranty screen filters and groups by it. */}
            <Field className="mb-0 mt-4">
              <Label htmlFor="item-supplier">Təchizatçı</Label>
              <Input
                id="item-supplier"
                placeholder="Məsələn: Bosch Rexroth"
                {...register('supplier')}
              />
              <FieldHint>Zəmanət tələbi bu təchizatçıya ünvanlanacaq.</FieldHint>
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
    <ApprovalSubmittedDialog
      open={approvalSent}
      onOpenChange={setApprovalSent}
      description="Məhsul redaktəsi"
    />
    </>
  );
}
