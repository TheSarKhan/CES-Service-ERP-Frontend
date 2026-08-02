'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { GripVertical, ListTree, Pencil, Plus, Trash2 } from 'lucide-react';
import {
  useAddInventoryCategoryField,
  useDeleteInventoryCategory,
  useInventoryCategories,
  useReorderInventoryCategoryFields,
  useRemoveInventoryCategoryField,
  useUpdateInventoryCategoryField,
} from '@/hooks/use-inventory';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label, Field } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Empty } from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { CategoryFormDialog } from '@/components/inventory/CategoryFormDialog';
import { ApiRequestError } from '@/lib/api/client';
import { cn } from '@/lib/utils';
import type { InventoryCategory, InventoryCategoryField, InventoryFieldType } from '@/types/inventory';

const FIELD_TYPES: InventoryFieldType[] = ['TEXT', 'TEXTAREA', 'NUMBER', 'DATE', 'IMAGE', 'MULTI_IMAGE'];

const FIELD_TYPE_LABELS: Record<InventoryFieldType, string> = {
  TEXT: 'Mətn',
  TEXTAREA: 'Uzun mətn',
  NUMBER: 'Ədəd',
  DATE: 'Tarix',
  IMAGE: 'Şəkil',
  MULTI_IMAGE: 'Çoxlu şəkil',
};

interface NewFieldForm {
  label: string;
  fieldType: InventoryFieldType;
  isRequired: boolean;
  showInTable: boolean;
}

const AZ_CHAR_MAP: Record<string, string> = {
  ə: 'e', ö: 'o', ü: 'u', ş: 's', ç: 'c', ğ: 'g', ı: 'i',
};

/** Derives a clean snake_case field_key from a human label — users no longer type it directly. */
function slugifyFieldKey(label: string): string {
  const transliterated = label
    .toLowerCase()
    .split('')
    .map((ch) => AZ_CHAR_MAP[ch] ?? ch)
    .join('')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  return transliterated
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 100);
}

function uniqueFieldKey(base: string, existingKeys: string[]): string {
  const safeBase = base || 'sahe';
  if (!existingKeys.includes(safeBase)) return safeBase;
  let i = 2;
  while (existingKeys.includes(`${safeBase}_${i}`)) i++;
  return `${safeBase}_${i}`;
}

/**
 * Category manager laid out like the Layer (Qovluq strukturu) screen — a list on the right to
 * pick a category, and its dynamic field schema on the left, so adding/removing fields doesn't
 * require a modal.
 */
export function CategoryManager() {
  const { data: categories, isLoading, isError } = useInventoryCategories();
  const deleteCategory = useDeleteInventoryCategory();
  const addField = useAddInventoryCategoryField();
  const updateField = useUpdateInventoryCategoryField();
  const removeField = useRemoveInventoryCategoryField();
  const reorderFields = useReorderInventoryCategoryFields();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<InventoryCategory | null>(null);
  const [fieldDialogOpen, setFieldDialogOpen] = useState(false);
  const [editingField, setEditingField] = useState<InventoryCategoryField | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [draggedFieldId, setDraggedFieldId] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedId && categories && categories.length > 0) {
      setSelectedId(categories[0].id);
    }
  }, [categories, selectedId]);

  const selectedCategory = categories?.find((c) => c.id === selectedId) ?? null;

  const { register, handleSubmit, reset } = useForm<NewFieldForm>({
    defaultValues: { label: '', fieldType: 'TEXT', isRequired: false, showInTable: false },
  });

  async function handleDelete(category: InventoryCategory) {
    setListError(null);
    try {
      await deleteCategory.mutateAsync(category.id);
      if (selectedId === category.id) setSelectedId(null);
    } catch (error) {
      setListError(
        error instanceof ApiRequestError && error.code === 'CATEGORY_NOT_EMPTY'
          ? 'Bu kateqoriyada məhsullar var — əvvəlcə onları başqa kateqoriyaya köçürün və ya silin.'
          : 'Kateqoriya silinmədi.',
      );
    }
  }

  function openAddField() {
    setFieldError(null);
    reset({ label: '', fieldType: 'TEXT', isRequired: false, showInTable: false });
    setEditingField(null);
    setFieldDialogOpen(true);
  }

  function openEditField(field: InventoryCategoryField) {
    setFieldError(null);
    reset({
      label: field.label,
      fieldType: field.fieldType,
      isRequired: field.isRequired,
      showInTable: field.showInTable,
    });
    setEditingField(field);
    setFieldDialogOpen(true);
  }

  function closeFieldDialog() {
    setFieldDialogOpen(false);
    setEditingField(null);
  }

  const onSubmitField = async (values: NewFieldForm) => {
    if (!selectedCategory) return;
    setFieldError(null);

    const trimmedLabel = values.label.trim();
    const isDuplicateLabel = (selectedCategory.fields ?? []).some(
      (f) => f.id !== editingField?.id && f.label.trim().toLowerCase() === trimmedLabel.toLowerCase(),
    );
    if (isDuplicateLabel) {
      setFieldError('Bu adda sahə artıq mövcuddur.');
      return;
    }

    try {
      if (editingField) {
        await updateField.mutateAsync({
          categoryId: selectedCategory.id,
          fieldId: editingField.id,
          body: {
            fieldKey: editingField.fieldKey,
            label: values.label,
            fieldType: values.fieldType,
            isRequired: values.isRequired,
            showInTable: values.showInTable,
          },
        });
      } else {
        const existingKeys = (selectedCategory.fields ?? []).map((f) => f.fieldKey);
        const fieldKey = uniqueFieldKey(slugifyFieldKey(values.label), existingKeys);
        await addField.mutateAsync({
          categoryId: selectedCategory.id,
          body: {
            fieldKey,
            label: values.label,
            fieldType: values.fieldType,
            isRequired: values.isRequired,
            showInTable: values.showInTable,
          },
        });
      }
      reset();
      closeFieldDialog();
    } catch (err) {
      setFieldError(
        err instanceof ApiRequestError && err.code === 'DUPLICATE_FIELD_KEY'
          ? 'Bu field_key artıq mövcuddur.'
          : editingField
            ? 'Sahə yenilənmədi.'
            : 'Sahə əlavə edilmədi.',
      );
    }
  };

  async function handleRemoveField(fieldId: string) {
    if (!selectedCategory) return;
    setFieldError(null);
    try {
      await removeField.mutateAsync({ categoryId: selectedCategory.id, fieldId });
    } catch {
      setFieldError('Sahə silinmədi.');
    }
  }

  async function handleToggleRequired(field: InventoryCategoryField) {
    if (!selectedCategory) return;
    setFieldError(null);
    try {
      await updateField.mutateAsync({
        categoryId: selectedCategory.id,
        fieldId: field.id,
        body: {
          fieldKey: field.fieldKey,
          label: field.label,
          fieldType: field.fieldType,
          isRequired: !field.isRequired,
          showInTable: field.showInTable,
        },
      });
    } catch {
      setFieldError('Sahə yenilənmədi.');
    }
  }

  async function handleToggleShowInTable(field: InventoryCategoryField) {
    if (!selectedCategory) return;
    setFieldError(null);
    try {
      await updateField.mutateAsync({
        categoryId: selectedCategory.id,
        fieldId: field.id,
        body: {
          fieldKey: field.fieldKey,
          label: field.label,
          fieldType: field.fieldType,
          isRequired: field.isRequired,
          showInTable: !field.showInTable,
        },
      });
    } catch {
      setFieldError('Sahə yenilənmədi.');
    }
  }

  function handleFieldDrop(targetId: string) {
    if (!selectedCategory || !draggedFieldId || draggedFieldId === targetId) {
      setDraggedFieldId(null);
      return;
    }
    const ids = (selectedCategory.fields ?? []).map((f) => f.id);
    const fromIndex = ids.indexOf(draggedFieldId);
    const toIndex = ids.indexOf(targetId);
    setDraggedFieldId(null);
    if (fromIndex === -1 || toIndex === -1) return;

    const reordered = [...ids];
    reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, draggedFieldId);
    reorderFields.mutate({ categoryId: selectedCategory.id, fieldIds: reordered });
  }

  return (
    <div>
      <div className="mb-4">
        <h3 className="text-base font-bold">Kateqoriyalar</h3>
        <p className="text-sm text-muted-foreground">Hər kateqoriya öz dinamik sahə sxemini daşıyır</p>
      </div>

      {isError && (
        <Alert variant="danger" title="Yüklənmədi">
          Kateqoriya siyahısı yüklənə bilmədi.
        </Alert>
      )}

      {isLoading && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      )}

      {!isLoading && !isError && categories && categories.length === 0 && (
        <Empty
          title="Kateqoriya yoxdur"
          description="Məhsul əlavə etməzdən əvvəl ən azı bir kateqoriya yaradın."
          icon={<ListTree className="mx-auto h-12 w-12" />}
          action={
            <Button variant="primary" size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" />
              Yeni kateqoriya
            </Button>
          }
        />
      )}

      {!isLoading && !isError && categories && categories.length > 0 && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
          {/* Left: selected category's dynamic fields */}
          <div className="rounded-xl border border-line">
            {!selectedCategory ? (
              <div className="p-6">
                <Empty title="Kateqoriya seçin" description="Sahələrini görmək üçün sağdan bir kateqoriya seçin." />
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between border-b border-line px-4 py-3">
                  <div>
                    <div className="font-bold">{selectedCategory.name}</div>
                    <div className="text-xs text-muted-foreground">
                      Ölçü vahidi: {selectedCategory.defaultUnit}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditingCategory(selectedCategory)}
                    className="btn btn-ghost btn-icon"
                    aria-label="Redaktə et"
                    title="Adı / ölçü vahidini redaktə et"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                </div>

                <div className="p-4">
                  {fieldError && !fieldDialogOpen && (
                    <div className="mb-3">
                      <Alert variant="danger" title="Xəta">
                        {fieldError}
                      </Alert>
                    </div>
                  )}

                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                      Sahələr
                    </span>
                    <Button variant="outline" size="sm" onClick={openAddField}>
                      <Plus className="h-4 w-4" />
                      Yeni sahə
                    </Button>
                  </div>

                  {(selectedCategory.fields ?? []).length === 0 ? (
                    <p className="mb-4 text-sm text-muted-foreground">Hələ dinamik sahə əlavə edilməyib.</p>
                  ) : (
                    <div className="mb-4 overflow-x-auto rounded-lg border border-line">
                      <table className="tbl w-full">
                        <thead>
                          <tr>
                            <th className="w-6" />
                            <th>Ad</th>
                            <th>Tip</th>
                            <th>Məcburi</th>
                            <th>Cədvəldə göstər</th>
                            <th className="r">Əməliyyat</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(selectedCategory.fields ?? []).map((field) => (
                            <tr
                              key={field.id}
                              draggable
                              onDragStart={() => setDraggedFieldId(field.id)}
                              onDragOver={(e) => e.preventDefault()}
                              onDrop={() => handleFieldDrop(field.id)}
                              className={cn(draggedFieldId === field.id && 'opacity-40')}
                            >
                              <td className="cursor-grab text-muted-foreground">
                                <GripVertical className="h-4 w-4" />
                              </td>
                              <td className="font-semibold">{field.label}</td>
                              <td>
                                <Badge variant="mute" size="sm">
                                  {FIELD_TYPE_LABELS[field.fieldType]}
                                </Badge>
                              </td>
                              <td>
                                <Checkbox
                                  size="sm"
                                  checked={field.isRequired}
                                  disabled={updateField.isPending}
                                  onChange={() => handleToggleRequired(field)}
                                />
                              </td>
                              <td>
                                <Checkbox
                                  size="sm"
                                  checked={field.showInTable}
                                  disabled={updateField.isPending}
                                  onChange={() => handleToggleShowInTable(field)}
                                />
                              </td>
                              <td className="r">
                                <button
                                  type="button"
                                  onClick={() => openEditField(field)}
                                  className="btn btn-ghost btn-icon"
                                  aria-label="Redaktə et"
                                >
                                  <Pencil className="h-4 w-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveField(field.id)}
                                  className="btn btn-ghost btn-icon"
                                  aria-label="Sahəni sil"
                                >
                                  <Trash2 className="h-4 w-4 text-danger" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Right: category name list */}
          <div className="rounded-xl border border-line">
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <span className="font-bold">Kateqoriya adları</span>
              <Button variant="outline" size="xs" onClick={() => setCreateOpen(true)}>
                <Plus className="h-3.5 w-3.5" />
                Yeni
              </Button>
            </div>

            {listError && (
              <div className="p-3">
                <Alert variant="danger" title="Silinmədi">
                  {listError}
                </Alert>
              </div>
            )}

            <ul className="p-2">
              {categories.map((category) => {
                const isSelected = selectedId === category.id;
                return (
                  <li key={category.id}>
                    <div
                      className={cn(
                        'flex items-center gap-1.5 rounded-lg border border-transparent px-2 py-2 hover:border-line hover:bg-graphite-50',
                        isSelected && 'border-gold bg-gold-50',
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => setSelectedId(category.id)}
                        className="flex flex-1 items-center gap-2 text-left"
                      >
                        <ListTree className="h-4 w-4 shrink-0 text-gold" />
                        <span className="font-semibold">{category.name}</span>
                        <Badge variant="mute" size="sm">
                          {(category.fields ?? []).length}
                        </Badge>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(category)}
                        className="btn btn-ghost btn-icon shrink-0"
                        aria-label="Sil"
                      >
                        <Trash2 className="h-4 w-4 text-danger" />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}

      <CategoryFormDialog open={createOpen} onOpenChange={setCreateOpen} />
      <CategoryFormDialog
        open={Boolean(editingCategory)}
        onOpenChange={(open) => !open && setEditingCategory(null)}
        editingCategory={editingCategory}
      />

      <Dialog open={fieldDialogOpen} onOpenChange={(open) => !open && closeFieldDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingField ? `Sahəni redaktə et — ${editingField.label}` : 'Yeni sahə'}
              {!editingField && selectedCategory ? ` — ${selectedCategory.name}` : ''}
            </DialogTitle>
          </DialogHeader>

          {fieldError && (
            <div className="mb-3">
              <Alert variant="danger" title="Xəta">
                {fieldError}
              </Alert>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmitField)} noValidate>
            <div className="grid grid-cols-2 gap-2">
              <Field className="mb-0">
                <Label htmlFor="field-label" required>
                  Görünən ad
                </Label>
                <Input id="field-label" placeholder="Marka" {...register('label', { required: true })} />
              </Field>
              <Field className="mb-0">
                <Label htmlFor="field-type">Tip</Label>
                <select
                  id="field-type"
                  className="h-11 w-full rounded-[11px] border border-line bg-white px-3 text-sm"
                  {...register('fieldType')}
                >
                  {FIELD_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {FIELD_TYPE_LABELS[t]}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <div className="mt-3 flex items-center gap-4">
              <Checkbox {...register('isRequired')}>Məcburi</Checkbox>
              <Checkbox {...register('showInTable')}>Cədvəldə göstər</Checkbox>
            </div>

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={closeFieldDialog}>
                Ləğv et
              </Button>
              <Button
                type="submit"
                variant="primary"
                loading={editingField ? updateField.isPending : addField.isPending}
              >
                {editingField ? 'Yadda saxla' : (
                  <>
                    <Plus className="h-4 w-4" />
                    Əlavə et
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
