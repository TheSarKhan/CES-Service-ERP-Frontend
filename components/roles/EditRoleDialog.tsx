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
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label, Field, FieldError, FieldHint } from '@/components/ui/label';
import { Alert } from '@/components/ui/alert';
import { useUpdateRole } from '@/hooks/use-roles';
import { ApiRequestError } from '@/lib/api/client';
import type { Role } from '@/types/role';

const editRoleSchema = z.object({
  name: z.string().min(1, 'Ad tələb olunur').max(100, 'Ən çox 100 simvol'),
  code: z
    .string()
    .min(1, 'Kod tələb olunur')
    .max(100, 'Ən çox 100 simvol')
    .regex(/^[A-Z0-9_]+$/, 'Yalnız böyük hərflər, rəqəm və alt xətt (_)'),
  description: z.string().max(2000, 'Ən çox 2000 simvol').optional(),
  isActive: z.boolean(),
});

type EditRoleValues = z.infer<typeof editRoleSchema>;

/**
 * Renames / re-codes / (de)activates a role.
 *
 * Permissions are deliberately not edited here — they have their own panel, and folding them in
 * would mean an edit that only meant to fix a typo could silently rewrite the grant matrix.
 */
export function EditRoleDialog({
  role,
  open,
  onOpenChange,
}: {
  role: Role | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [serverError, setServerError] = useState<string | null>(null);
  const updateRole = useUpdateRole();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EditRoleValues>({
    resolver: zodResolver(editRoleSchema),
    defaultValues: { name: '', code: '', description: '', isActive: true },
  });

  useEffect(() => {
    if (open && role) {
      reset({
        name: role.name,
        code: role.code,
        description: role.description ?? '',
        isActive: role.isActive,
      });
      setServerError(null);
    }
  }, [open, role, reset]);

  if (!role) return null;

  const onSubmit = async (values: EditRoleValues) => {
    setServerError(null);
    try {
      await updateRole.mutateAsync({
        id: role.id,
        body: {
          name: values.name,
          code: values.code,
          description: values.description || null,
          isActive: values.isActive,
        },
      });
      onOpenChange(false);
    } catch (error) {
      if (error instanceof ApiRequestError && error.code === 'SYSTEM_ROLE_PROTECTED') {
        setServerError('Bu sistem roludur və dəyişdirilə bilməz.');
      } else if (error instanceof ApiRequestError && error.code === 'DUPLICATE_ROLE_CODE') {
        setServerError('Bu kod artıq başqa rolda istifadə olunur.');
      } else {
        setServerError(error instanceof Error ? error.message : 'Serverlə əlaqə qurulmadı.');
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rolu redaktə et</DialogTitle>
          <DialogDescription>
            İcazələr ayrıca idarə olunur — burada yalnız rolun özü dəyişir.
          </DialogDescription>
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
            <Label htmlFor="edit-role-name" required>
              Ad
            </Label>
            <Input id="edit-role-name" error={Boolean(errors.name)} {...register('name')} />
            {errors.name && <FieldError>{errors.name.message}</FieldError>}
          </Field>

          <Field>
            <Label htmlFor="edit-role-code" required>
              Kod
            </Label>
            <Input id="edit-role-code" error={Boolean(errors.code)} {...register('code')} />
            {errors.code ? (
              <FieldError>{errors.code.message}</FieldError>
            ) : (
              <FieldHint>Məsələn: ANBAR_MUDIRI</FieldHint>
            )}
          </Field>

          <Field>
            <Label htmlFor="edit-role-description">Açıqlama</Label>
            <Textarea
              id="edit-role-description"
              error={Boolean(errors.description)}
              {...register('description')}
            />
            {errors.description && <FieldError>{errors.description.message}</FieldError>}
          </Field>

          <Field>
            <Checkbox {...register('isActive')}>Aktiv</Checkbox>
            <FieldHint>Deaktiv rol istifadəçilərə təyin edilə bilməz.</FieldHint>
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
