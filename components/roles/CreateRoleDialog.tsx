'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label, Field, FieldError, FieldHint } from '@/components/ui/label';
import { Alert } from '@/components/ui/alert';
import { PermissionMatrixEditor } from '@/components/roles/PermissionMatrixEditor';
import { useCreateRole, useAssignPermissions, usePermissionCatalog } from '@/hooks/use-roles';
import { ApiRequestError } from '@/lib/api/client';
import { cn } from '@/lib/utils';
import type { Role, Permission } from '@/types/role';

const roleFormSchema = z.object({
  name: z.string().min(1, 'Ad tələb olunur').max(100, 'Ən çox 100 simvol'),
  code: z
    .string()
    .min(1, 'Kod tələb olunur')
    .max(100, 'Ən çox 100 simvol')
    .regex(/^[A-Z0-9_]+$/, 'Yalnız böyük hərflər, rəqəm və alt xətt (_)'),
  description: z.string().max(2000, 'Ən çox 2000 simvol').optional(),
});

type RoleFormValues = z.infer<typeof roleFormSchema>;

function StepChip({
  n,
  label,
  state,
}: {
  n: number;
  label: string;
  state: 'done' | 'on' | 'todo';
}) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={cn(
          'grid h-7 w-7 place-items-center rounded-full font-mono text-[13px] font-bold',
          state === 'done' && 'bg-graphite text-gold',
          state === 'on' && 'bg-gold text-white ring-4 ring-gold-100',
          state === 'todo' && 'bg-graphite-50 text-muted-foreground',
        )}
      >
        {n}
      </span>
      <span className={cn('text-[13.5px] font-bold', state === 'todo' && 'text-muted-foreground')}>
        {label}
      </span>
    </div>
  );
}

/**
 * "Yeni rol" flow (SRS M16.4): step 1 creates the bare role, step 2 shows the
 * permission matrix to grant it access. The role already exists in the
 * database after step 1 — closing mid-flow leaves a permission-less role
 * rather than discarding it, matching the 2-mərhələli spec literally.
 */
export function CreateRoleDialog() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [createdRole, setCreatedRole] = useState<Role | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [serverError, setServerError] = useState<string | null>(null);

  const { data: permissions, isLoading: catalogLoading } = usePermissionCatalog();
  const createRole = useCreateRole();
  const assignPermissions = useAssignPermissions();

  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<RoleFormValues>({
    resolver: zodResolver(roleFormSchema),
    defaultValues: { name: '', code: '', description: '' },
  });

  function resetAll() {
    setStep(1);
    setCreatedRole(null);
    setSelectedIds(new Set());
    setServerError(null);
    reset();
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) resetAll();
  }

  const onSubmitStep1 = async (values: RoleFormValues) => {
    setServerError(null);
    try {
      const role = await createRole.mutateAsync({
        name: values.name,
        code: values.code,
        description: values.description || null,
      });
      setCreatedRole(role);
      setStep(2);
    } catch (error) {
      if (error instanceof ApiRequestError && error.code === 'DUPLICATE_ROLE_CODE') {
        setError('code', { message: 'Bu rol kodu artıq mövcuddur' });
      } else {
        setServerError(
          error instanceof Error ? error.message : 'Serverlə əlaqə qurulmadı.',
        );
      }
    }
  };

  function toggleId(permission: Permission) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(permission.id)) {
        next.delete(permission.id);
      } else {
        next.add(permission.id);
      }
      return next;
    });
  }

  async function handleFinish() {
    if (!createdRole) return;
    setServerError(null);
    try {
      await assignPermissions.mutateAsync({
        roleId: createdRole.id,
        body: { permissionIds: Array.from(selectedIds) },
      });
      handleOpenChange(false);
    } catch (error) {
      setServerError(error instanceof Error ? error.message : 'Serverlə əlaqə qurulmadı.');
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="primary" size="sm">
          <Plus className="h-4 w-4" />
          Yeni rol
        </Button>
      </DialogTrigger>

      <DialogContent className={cn(step === 2 && 'max-w-3xl')}>
        <DialogHeader>
          <DialogTitle>Yeni rol yarat</DialogTitle>
          <DialogDescription>
            Əvvəlcə rolun məlumatlarını daxil edin, sonra icazələrini seçin.
          </DialogDescription>
        </DialogHeader>

        <div className="mb-5 flex items-center gap-3">
          <StepChip n={1} label="Rol məlumatları" state={step === 1 ? 'on' : 'done'} />
          <div className="h-px flex-1 bg-line" />
          <StepChip n={2} label="İcazələr" state={step === 2 ? 'on' : 'todo'} />
        </div>

        {serverError && (
          <div className="mb-4">
            <Alert variant="danger" title="Xəta baş verdi">
              {serverError}
            </Alert>
          </div>
        )}

        {step === 1 && (
          <form onSubmit={handleSubmit(onSubmitStep1)} noValidate>
            <Field>
              <Label htmlFor="role-name" required>
                Ad
              </Label>
              <Input
                id="role-name"
                placeholder="Anbar meneceri"
                error={Boolean(errors.name)}
                {...register('name')}
              />
              {errors.name && <FieldError>{errors.name.message}</FieldError>}
            </Field>

            <Field>
              <Label htmlFor="role-code" required>
                Kod
              </Label>
              <Input
                id="role-code"
                placeholder="WAREHOUSE_MANAGER"
                error={Boolean(errors.code)}
                {...register('code')}
              />
              {errors.code ? (
                <FieldError>{errors.code.message}</FieldError>
              ) : (
                <FieldHint>Yalnız böyük hərflər, rəqəm və alt xətt (_)</FieldHint>
              )}
            </Field>

            <Field>
              <Label htmlFor="role-description">Açıqlama</Label>
              <Textarea
                id="role-description"
                placeholder="Rolun məsuliyyət dairəsi haqqında qısa qeyd"
                error={Boolean(errors.description)}
                {...register('description')}
              />
              {errors.description && <FieldError>{errors.description.message}</FieldError>}
            </Field>

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => handleOpenChange(false)}>
                Ləğv et
              </Button>
              <Button type="submit" variant="primary" loading={isSubmitting}>
                Növbəti
              </Button>
            </DialogFooter>
          </form>
        )}

        {step === 2 && (
          <div>
            {catalogLoading && (
              <p className="text-sm text-muted-foreground">İcazələr yüklənir...</p>
            )}
            {!catalogLoading && permissions && (
              <PermissionMatrixEditor
                permissions={permissions}
                selectedIds={selectedIds}
                onToggle={toggleId}
              />
            )}

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setStep(1)}>
                Geri
              </Button>
              <Button
                type="button"
                variant="primary"
                loading={assignPermissions.isPending}
                onClick={handleFinish}
              >
                Yadda saxla
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
