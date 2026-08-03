'use client';

import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ChevronRight } from 'lucide-react';
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
import { Skeleton } from '@/components/ui/skeleton';
import { PermissionMatrixEditor } from '@/components/roles/PermissionMatrixEditor';
import { StepChip } from '@/components/roles/StepChip';
import {
  usePermissionCatalog,
  useRolePermissions,
  useSyncRolePermissions,
  useUpdateRole,
} from '@/hooks/use-roles';
import { ApiRequestError } from '@/lib/api/client';
import { cn } from '@/lib/utils';
import type { Permission, Role } from '@/types/role';

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
 * Two-step role edit, mirroring the "Yeni rol" wizard: details first, then the permission matrix.
 *
 * Unlike creation, nothing is written until the final save — the role already exists, so there is
 * no half-made record to guard against and a cancelled edit leaves it exactly as it was.
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
  const [step, setStep] = useState<1 | 2>(1);
  const [serverError, setServerError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const updateRole = useUpdateRole();
  const syncPermissions = useSyncRolePermissions();
  const { data: catalog, isLoading: catalogLoading } = usePermissionCatalog();
  const { data: current, isLoading: currentLoading } = useRolePermissions(
    open ? role?.id ?? null : null,
  );

  const currentIds = useMemo(() => (current ?? []).map((p) => p.id), [current]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EditRoleValues>({
    resolver: zodResolver(editRoleSchema),
    defaultValues: { name: '', code: '', description: '', isActive: true },
  });

  useEffect(() => {
    if (open && role) {
      setStep(1);
      setServerError(null);
      reset({
        name: role.name,
        code: role.code,
        description: role.description ?? '',
        isActive: role.isActive,
      });
    }
  }, [open, role, reset]);

  // Seed the matrix once the role's existing grants arrive.
  useEffect(() => {
    if (open && current) setSelectedIds(new Set(current.map((p) => p.id)));
  }, [open, current]);

  const goToPermissions = handleSubmit(() => {
    setServerError(null);
    setStep(2);
  });

  const saveAll = handleSubmit(async (values) => {
    if (!role) return;
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
      await syncPermissions.mutateAsync({
        roleId: role.id,
        selectedIds: Array.from(selectedIds),
        currentIds,
      });
      onOpenChange(false);
    } catch (error) {
      if (error instanceof ApiRequestError && error.code === 'DUPLICATE_ROLE_CODE') {
        // Send them back to the step the offending field lives on.
        setServerError('Bu kod artıq başqa rolda istifadə olunur.');
        setStep(1);
      } else {
        setServerError(error instanceof Error ? error.message : 'Serverlə əlaqə qurulmadı.');
      }
    }
  });

  if (!role) return null;

  function togglePermission(permission: Permission) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(permission.id)) next.delete(permission.id);
      else next.add(permission.id);
      return next;
    });
  }

  const saving = updateRole.isPending || syncPermissions.isPending;
  const permissionsLoading = catalogLoading || currentLoading;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(step === 2 && 'max-w-3xl')}>
        <DialogHeader>
          <DialogTitle>Rolu redaktə et — {role.name}</DialogTitle>
          <DialogDescription>
            {step === 1 ? 'Rolun adı, kodu və açıqlaması' : 'Bu rola verilən icazələr'}
          </DialogDescription>
        </DialogHeader>

        <div className="mb-4 flex items-center gap-3">
          <StepChip n={1} label="Rol məlumatları" state={step === 1 ? 'on' : 'done'} />
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
          <StepChip n={2} label="İcazələr" state={step === 2 ? 'on' : 'todo'} />
        </div>

        {serverError && (
          <div className="mb-4">
            <Alert variant="danger" title="Xəta">
              {serverError}
            </Alert>
          </div>
        )}

        {step === 1 && (
          <form onSubmit={goToPermissions} noValidate>
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
              <Button type="submit" variant="primary">
                Davam
                <ChevronRight className="h-4 w-4" />
              </Button>
            </DialogFooter>
          </form>
        )}

        {step === 2 && (
          <>
            {permissionsLoading && <Skeleton className="h-64 w-full" />}
            {!permissionsLoading && catalog && (
              <>
                <p className="mb-3 text-sm text-muted-foreground">
                  Seçilmiş: <span className="font-bold text-foreground">{selectedIds.size}</span>{' '}
                  icazə
                </p>
                <PermissionMatrixEditor
                  permissions={catalog}
                  selectedIds={selectedIds}
                  onToggle={togglePermission}
                />
              </>
            )}

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setStep(1)}>
                Geri
              </Button>
              <Button type="button" variant="primary" loading={saving} onClick={saveAll}>
                Yadda saxla
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
