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
import { Check, ChevronLeft, ChevronRight, PackageMinus, ShieldCheck } from 'lucide-react';
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
import { cn } from '@/lib/utils';
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
  isLotTracked: z.boolean().optional(),
  expiryWarningDays: z.preprocess(
    (v) => (v === '' || v === null ? undefined : v),
    z.coerce.number().int().min(1).optional(),
  ),
  // Empty string -> undefined so an untouched warranty field stays null rather than becoming 0.
  warrantyMonths: z.preprocess(
    (v) => (v === '' || v === null ? undefined : v),
    z.coerce.number().int().min(0, 'Mənfi ola bilməz').optional(),
  ),
  warrantyStartDate: z.string().optional(),
  warrantyEndDate: z.string().optional(),
  minQuantity: z.preprocess(
    (v) => (v === '' || v === null ? undefined : v),
    z.coerce.number().min(0, 'Mənfi ola bilməz').optional(),
  ),
  criticalQuantity: z.preprocess(
    (v) => (v === '' || v === null ? undefined : v),
    z.coerce.number().min(0, 'Mənfi ola bilməz').optional(),
  ),
  supplier: z.string().max(255).optional(),
  notes: z.string().max(2000).optional(),
});

type ItemFormValues = z.infer<typeof itemFormSchema>;

type StepKey = 'basics' | 'stock' | 'fields' | 'extra';

/**
 * The create flow, in the order the answers actually arrive.
 *
 * Required first, optional last: everything through "Stok" has to be filled for the product to
 * exist at all, so a step that fails validation fails early rather than after twenty fields. The
 * dynamic-field step disappears entirely for a category that defines none — an empty screen
 * between two full ones reads like something failed to load.
 */
const STEP_META: Record<StepKey, { label: string; hint: string }> = {
  basics: { label: 'Əsas', hint: 'Məhsul nədir və necə tanınır' },
  stock: { label: 'Stok', hint: 'Nə qədər var və necə izlənir' },
  fields: { label: 'Sahələr', hint: 'Kateqoriyanın öz sahələri' },
  extra: { label: 'Əlavə', hint: 'Zəmanət, təchizatçı, qeyd — hamısı könüllü' },
};

/**
 * How a product's quantity is known. Exactly one applies — the truth about how much there is has
 * to live in one place — so these are radios, not the two checkboxes they used to be, where
 * "neither" and "both" were states the form could express but the domain could not.
 */
const TRACKING_MODES = [
  { value: 'PLAIN', label: 'Adi', hint: 'Sadəcə miqdar' },
  { value: 'SERIAL', label: 'Seriyalı', hint: 'Hər ədədin öz nömrəsi' },
  { value: 'LOT', label: 'Partiyalı', hint: 'Son istifadə tarixi ilə' },
] as const;

type TrackingMode = (typeof TRACKING_MODES)[number]['value'];

/** Which values each step owns, so "İrəli" only validates what is on screen. */
const STEP_FIELDS: Record<StepKey, (keyof ItemFormValues)[]> = {
  basics: ['categoryId', 'name', 'sku', 'barcode', 'unit', 'purchasePrice'],
  stock: ['quantity', 'minQuantity', 'criticalQuantity', 'expiryWarningDays'],
  fields: [],
  extra: ['warrantyMonths', 'warrantyStartDate', 'warrantyEndDate', 'supplier', 'notes'],
};

export interface ItemFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Node the item is created at (fixed — items move via a dedicated action, not this form). */
  nodeId: string;
  editingItem?: InventoryItem | null;
  /** Pre-selects the category when opened from a specific category section (create only). */
  initialCategoryId?: string;
}

/**
 * Where you are and how much is left.
 *
 * Steps already passed stay legible rather than greying out — they are still reachable with "Geri",
 * and dimming them would suggest otherwise.
 */
function StepIndicator({ steps, current }: { steps: StepKey[]; current: number }) {
  return (
    <div className="mb-5">
      <div className="flex items-center gap-2">
        {steps.map((key, index) => (
          <div key={key} className="flex flex-1 items-center gap-2">
            <div
              className={cn(
                'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors',
                index < current && 'bg-ok/15 text-ok',
                index === current && 'bg-gold text-white',
                index > current && 'bg-graphite-50 text-muted-foreground',
              )}
            >
              {index < current ? <Check className="h-3.5 w-3.5" /> : index + 1}
            </div>
            <span
              className={cn(
                'truncate text-sm',
                index === current ? 'font-bold' : 'text-muted-foreground',
              )}
            >
              {STEP_META[key].label}
            </span>
            {index < steps.length - 1 && <div className="h-px flex-1 bg-line" />}
          </div>
        ))}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{STEP_META[steps[current]].hint}</p>
    </div>
  );
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
  const [step, setStep] = useState(0);
  const isEditing = Boolean(editingItem);
  // Editing stays a single form. A wizard is right when you are answering questions for the first
  // time and wrong when you came to fix one typo and would have to walk past three screens to
  // reach it.
  const isWizard = !isEditing;

  const { data: categories } = useInventoryCategories();
  const createItem = useCreateInventoryItem();
  const updateItem = useUpdateInventoryItem();

  const {
    register,
    handleSubmit,
    watch,
    reset,
    trigger,
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
      isLotTracked: false,
      expiryWarningDays: undefined,
      warrantyMonths: undefined,
      warrantyStartDate: '',
      warrantyEndDate: '',
      minQuantity: undefined,
      criticalQuantity: undefined,
      supplier: '',
      notes: '',
    },
  });

  const selectedCategoryId = watch('categoryId');
  const selectedCategory = useMemo(
    () => categories?.find((c) => c.id === selectedCategoryId) ?? null,
    [categories, selectedCategoryId],
  );

  const visibleFields = useMemo(
    () => (selectedCategory?.fields ?? []).filter((f) => f.isVisible),
    [selectedCategory],
  );

  const steps: StepKey[] = useMemo(
    () =>
      (['basics', 'stock', 'fields', 'extra'] as StepKey[]).filter(
        (key) => key !== 'fields' || visibleFields.length > 0,
      ),
    [visibleFields.length],
  );

  const currentStep = steps[Math.min(step, steps.length - 1)];
  const isLastStep = step >= steps.length - 1;
  /** Editing shows every section at once; creating shows one step at a time. */
  const show = (key: StepKey) => !isWizard || currentStep === key;


  const watchIsSerialized = watch('isSerialized');
  // A product is serialized, batch-tracked or plain — never two at once, because the truth about
  // its quantity has to live in exactly one place.
  const watchIsLotTracked = watch('isLotTracked');
const trackingMode: TrackingMode = watchIsSerialized
    ? 'SERIAL'
    : watchIsLotTracked
      ? 'LOT'
      : 'PLAIN';

  function pickTrackingMode(mode: TrackingMode) {
    setValue('isSerialized', mode === 'SERIAL');
    setValue('isLotTracked', mode === 'LOT');
  }

  const currentUnit = watch('unit');
  const unitOptions = useMemo(
    () => (currentUnit && !UNIT_OPTIONS.includes(currentUnit) ? [currentUnit, ...UNIT_OPTIONS] : UNIT_OPTIONS),
    [currentUnit],
  );

  useEffect(() => {
    if (!open) return;
    setServerError(null);
    setAttributeErrors([]);
    setStep(0);
    if (editingItem) {
      reset({
        categoryId: editingItem.categoryId,
        name: editingItem.name,
        sku: editingItem.sku,
        barcode: editingItem.barcode ?? '',
        unit: editingItem.unit,
        quantity: 0, // opening balance only — an edit never moves stock
        purchasePrice: editingItem.purchasePrice,
        isSerialized: editingItem.isSerialized,
        isLotTracked: editingItem.isLotTracked,
        expiryWarningDays: editingItem.expiryWarningDays ?? undefined,
        warrantyMonths: editingItem.warrantyMonths ?? undefined,
        warrantyStartDate: editingItem.warrantyStartDate ?? '',
        warrantyEndDate: editingItem.warrantyEndDate ?? '',
        minQuantity: editingItem.minQuantity ?? undefined,
        criticalQuantity: editingItem.criticalQuantity ?? undefined,
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
        isLotTracked: false,
        expiryWarningDays: undefined,
        warrantyMonths: undefined,
        warrantyStartDate: '',
        warrantyEndDate: '',
        minQuantity: undefined,
        criticalQuantity: undefined,
        supplier: '',
        notes: '',
      });
      setAttributes({});
    }
  }, [open, editingItem, initialCategoryId, categories, reset]);

  /** Required category fields that are still empty, by label. */
  function missingAttributes(): string[] {
    return (selectedCategory?.fields ?? [])
      .filter(
        (f) =>
          f.isRequired &&
          (attributes[f.fieldKey] === undefined ||
            attributes[f.fieldKey] === null ||
            attributes[f.fieldKey] === ''),
      )
      .map((f) => f.label);
  }

  async function goNext() {
    const fields = STEP_FIELDS[currentStep];
    if (fields.length > 0 && !(await trigger(fields))) return;
    if (currentStep === 'fields') {
      const missing = missingAttributes();
      setAttributeErrors(missing);
      if (missing.length > 0) return;
    }
    setServerError(null);
    setStep((s) => s + 1);
  }

  /**
   * Enter inside a field would otherwise submit a half-filled product from step one, so on every
   * step but the last it advances instead.
   */
  function handleFormSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isWizard && !isLastStep) {
      void goNext();
      return;
    }
    void handleSubmit(onSubmit)();
  }

  const onSubmit = async (values: ItemFormValues) => {
    setServerError(null);

    const missing = missingAttributes();
    if (missing.length > 0) {
      setAttributeErrors(missing);
      // Send the user back to the step that owns the empty fields rather than reporting them from
      // a screen where they cannot be filled in.
      if (isWizard) setStep(steps.indexOf('fields'));
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
      isLotTracked: values.isLotTracked,
      expiryWarningDays: values.expiryWarningDays ?? null,
      attributes,
      warrantyMonths: values.warrantyMonths ?? null,
      warrantyStartDate: values.warrantyStartDate || null,
      warrantyEndDate: values.warrantyEndDate || null,
      minQuantity: values.minQuantity ?? null,
      criticalQuantity: values.criticalQuantity ?? null,
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

        <form onSubmit={handleFormSubmit} noValidate>
          {isWizard && <StepIndicator steps={steps} current={step} />}

          {show('basics') && (
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

          </div>
          )}

          {show('stock') && (
          <>
          <div className="grid grid-cols-2 gap-4">
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
              {errors.quantity ? (
                <FieldError>{errors.quantity.message}</FieldError>
              ) : (
                !isEditing && (
                  <FieldHint>Bu qovluğa yazılacaq açılış qalığı.</FieldHint>
                )
              )}
            </Field>
          </div>

          <Field>
            <Label required>İzləmə üsulu</Label>
            <div className="grid grid-cols-3 gap-2">
              {TRACKING_MODES.map((mode) => (
                <label
                  key={mode.value}
                  className={cn(
                    'rounded-lg border px-3 py-2.5 transition-colors',
                    trackingMode === mode.value
                      ? 'border-gold bg-gold/5'
                      : 'border-line hover:bg-graphite-50',
                    // Changing it later would orphan the units or batches already recorded, so it
                    // is decided once, when the product is created.
                    isEditing ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
                  )}
                >
                  <span className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="tracking-mode"
                      className="chk"
                      value={mode.value}
                      checked={trackingMode === mode.value}
                      disabled={isEditing}
                      onChange={() => pickTrackingMode(mode.value)}
                    />
                    {/* Never wraps: three labels breaking onto three lines each turned this row
                        into a wall of text. */}
                    <span className="whitespace-nowrap text-sm font-semibold">{mode.label}</span>
                  </span>
                  <span className="mt-0.5 block whitespace-nowrap text-xs text-muted-foreground">
                    {mode.hint}
                  </span>
                </label>
              ))}
            </div>
          </Field>

          {watchIsLotTracked && (
            <Field className="mt-2">
              <Label htmlFor="item-expiry-warning">Bitmə xəbərdarlığı (gün)</Label>
              <Input
                id="item-expiry-warning"
                type="number"
                min="1"
                placeholder="30"
                {...register('expiryWarningDays')}
              />
              <FieldHint>
                Boş qalsa 30 gün — zəmanətdəki ilə eyni. Kimyəvi maddəyə daha uzun verilə bilər.
              </FieldHint>
            </Field>
          )}

          {/* Thresholds compare against the TOTAL across folders — an empty shelf while forty sit
              in the next aisle is a moving problem, not a buying one. */}
          <div className="mt-2 rounded-lg border border-line p-3">
            <div className="mb-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
              <PackageMinus className="h-3.5 w-3.5 text-gold" />
              Stok həddi
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field className="mb-0">
                <Label htmlFor="item-min-qty">Minimum hədd</Label>
                <Input
                  id="item-min-qty"
                  type="number"
                  step="0.001"
                  min="0"
                  placeholder="məsələn 10"
                  error={Boolean(errors.minQuantity)}
                  {...register('minQuantity')}
                />
                {errors.minQuantity ? (
                  <FieldError>{errors.minQuantity.message}</FieldError>
                ) : (
                  <FieldHint>Ümumi qalıq bundan aşağı düşəndə xəbərdarlıq verilir.</FieldHint>
                )}
              </Field>
              <Field className="mb-0">
                <Label htmlFor="item-critical-qty">Kritik hədd</Label>
                <Input
                  id="item-critical-qty"
                  type="number"
                  step="0.001"
                  min="0"
                  placeholder="məsələn 3"
                  error={Boolean(errors.criticalQuantity)}
                  {...register('criticalQuantity')}
                />
                {errors.criticalQuantity ? (
                  <FieldError>{errors.criticalQuantity.message}</FieldError>
                ) : (
                  <FieldHint>Minimumdan aşağı olmalıdır — iş dayanma riski.</FieldHint>
                )}
              </Field>
            </div>
          </div>
          </>
          )}

          {show('extra') && (
          <>
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

          </div>

          <div className="mt-2 rounded-lg border border-line p-3">
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

          <Field className="mt-2">
            <Label htmlFor="item-notes">Qeyd</Label>
            <Textarea id="item-notes" {...register('notes')} />
          </Field>
          </>
          )}

          {show('fields') && (
          <div>
            {visibleFields.map((field) => (
              <Field key={field.id} className="mt-2">
                <Label required={field.isRequired}>{field.label}</Label>
                <DynamicFieldInput
                  field={field}
                  value={attributes[field.fieldKey]}
                  onChange={(value) => setAttributes((prev) => ({ ...prev, [field.fieldKey]: value }))}
                />
              </Field>
            ))}
          </div>
          )}

          <DialogFooter>
            {isWizard && step > 0 ? (
              <Button key="back" type="button" variant="ghost" onClick={() => setStep((s) => s - 1)}>
                <ChevronLeft className="h-4 w-4" />
                Geri
              </Button>
            ) : (
              <Button key="cancel" type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                Ləğv et
              </Button>
            )}
            {/* The keys matter. Without them React reuses one <button> for both branches and only
                swaps its `type`, so advancing to the last step flipped the very element being
                clicked from "button" to "submit" — and the browser then applied the default action
                of a submit button to a click that was meant to say "next". Distinct keys force a
                fresh node, so the in-flight click can never turn into a submit. */}
            {isWizard && !isLastStep ? (
              <Button key="next" type="button" variant="primary" onClick={() => void goNext()}>
                İrəli
                <ChevronRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button key="save" type="submit" variant="primary" loading={isSubmitting}>
                Yadda saxla
              </Button>
            )}
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
