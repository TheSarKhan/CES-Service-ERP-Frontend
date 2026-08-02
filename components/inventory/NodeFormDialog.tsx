'use client';

import { useEffect, useState } from 'react';
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
import { Label, Field, FieldError, FieldHint } from '@/components/ui/label';
import { Alert } from '@/components/ui/alert';
import {
  useCreateInventoryNode,
  useInventoryCategories,
  useUpdateInventoryNode,
} from '@/hooks/use-inventory';
import { ApiRequestError } from '@/lib/api/client';
import type { InventoryNode } from '@/types/inventory';

const nodeFormSchema = z.object({
  name: z.string().min(1, 'Ad tələb olunur').max(255, 'Ən çox 255 simvol'),
  code: z.string().max(100, 'Ən çox 100 simvol').optional(),
  notes: z.string().max(2000, 'Ən çox 2000 simvol').optional(),
});

type NodeFormValues = z.infer<typeof nodeFormSchema>;

export interface NodeFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Parent under which a new node is created; ignored when editing. */
  parentId: string | null;
  /** When set, the dialog edits this node instead of creating a new one. */
  editingNode?: InventoryNode | null;
  onSaved?: (node: InventoryNode) => void;
}

/** Create/rename a Layer node. */
export function NodeFormDialog({ open, onOpenChange, parentId, editingNode, onSaved }: NodeFormDialogProps) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const createNode = useCreateInventoryNode();
  const updateNode = useUpdateInventoryNode();
  const { data: categories } = useInventoryCategories();
  const isEditing = Boolean(editingNode);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<NodeFormValues>({
    resolver: zodResolver(nodeFormSchema),
    defaultValues: { name: '', code: '', notes: '' },
  });

  useEffect(() => {
    if (open) {
      reset({
        name: editingNode?.name ?? '',
        code: editingNode?.code ?? '',
        notes: editingNode?.notes ?? '',
      });
      setCategoryIds(editingNode?.categoryIds ?? []);
      setServerError(null);
    }
  }, [open, editingNode, reset]);

  const onSubmit = async (values: NodeFormValues) => {
    setServerError(null);
    try {
      const node = isEditing
        ? await updateNode.mutateAsync({
            id: editingNode!.id,
            body: {
              name: values.name,
              code: values.code || null,
              parentId: editingNode!.parentId,
              notes: values.notes || null,
              isActive: editingNode!.isActive,
              categoryIds,
            },
          })
        : await createNode.mutateAsync({
            name: values.name,
            code: values.code || null,
            parentId,
            notes: values.notes || null,
            categoryIds,
          });
      onSaved?.(node);
      onOpenChange(false);
    } catch (error) {
      if (error instanceof ApiRequestError && error.code === 'DUPLICATE_NODE_NAME') {
        setServerError('Bu adda bir node artıq bu səviyyədə mövcuddur.');
      } else {
        setServerError(error instanceof Error ? error.message : 'Serverlə əlaqə qurulmadı.');
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Node-u redaktə et' : 'Yeni node yarat'}</DialogTitle>
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
            <Label htmlFor="node-name" required>
              Ad
            </Label>
            <Input
              id="node-name"
              placeholder="Anbar, Şkaf 3, Rəf B ..."
              error={Boolean(errors.name)}
              {...register('name')}
            />
            {errors.name && <FieldError>{errors.name.message}</FieldError>}
          </Field>

          <Field>
            <Label htmlFor="node-code">Kod (opsional)</Label>
            <Input id="node-code" error={Boolean(errors.code)} {...register('code')} />
            {errors.code && <FieldError>{errors.code.message}</FieldError>}
          </Field>

          <Field>
            <Label htmlFor="node-notes">Qeyd</Label>
            <Textarea id="node-notes" error={Boolean(errors.notes)} {...register('notes')} />
            {errors.notes && <FieldError>{errors.notes.message}</FieldError>}
          </Field>

          <Field>
            <Label>İcazəli kateqoriyalar (opsional)</Label>
            {categories && categories.length > 0 ? (
              <div className="flex flex-wrap gap-3">
                {categories.map((category) => (
                  <Checkbox
                    key={category.id}
                    size="sm"
                    checked={categoryIds.includes(category.id)}
                    onChange={(e) => {
                      setCategoryIds((prev) =>
                        e.target.checked
                          ? [...prev, category.id]
                          : prev.filter((id) => id !== category.id),
                      );
                    }}
                  >
                    {category.name}
                  </Checkbox>
                ))}
              </div>
            ) : (
              <FieldHint>Hələ kateqoriya yaradılmayıb.</FieldHint>
            )}
            <FieldHint>
              Heç biri seçilməyibsə, bu node-da istənilən kateqoriyadan məhsul əlavə edilə bilər.
            </FieldHint>
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
