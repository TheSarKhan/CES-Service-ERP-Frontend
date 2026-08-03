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
import { Checkbox } from '@/components/ui/checkbox';
import { Label, Field, FieldError, FieldHint } from '@/components/ui/label';
import { Alert } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { StepChip } from '@/components/roles/StepChip';
import { useCreateUser, useSyncUserRoles, useUpdateUser, useUser } from '@/hooks/use-users';
import { useRoles } from '@/hooks/use-roles';
import { useAuthStore } from '@/store/auth-store';
import { ApiRequestError } from '@/lib/api/client';
import { cn } from '@/lib/utils';
import type { ManagedUser } from '@/types/user';

const userFormSchema = z.object({
  fullName: z.string().min(1, 'Ad tələb olunur').max(255),
  email: z.string().min(1, 'Email tələb olunur').email('Düzgün email daxil edin').max(255),
  phone: z.string().max(50).optional(),
  position: z.string().max(100).optional(),
  isActive: z.boolean(),
});

type UserFormValues = z.infer<typeof userFormSchema>;

/**
 * Two-step user form: details, then role assignment — the same shape as the role wizard.
 *
 * No password field: on create the server issues a temporary one that the person must replace at
 * first login, so nobody has to invent (or transmit) a password here.
 */
export function UserFormDialog({
  open,
  onOpenChange,
  editingUser,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingUser?: ManagedUser | null;
  /** Hands the one-time password back so the caller can display it. */
  onCreated?: (email: string, temporaryPassword: string | null) => void;
}) {
  const [step, setStep] = useState<1 | 2>(1);
  const [serverError, setServerError] = useState<string | null>(null);
  const [selectedRoleIds, setSelectedRoleIds] = useState<Set<string>>(new Set());

  const branchId = useAuthStore((s) => s.activeBranchId);
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const syncRoles = useSyncUserRoles();
  const { data: rolePage, isLoading: rolesLoading } = useRoles({ page: 1, size: 100 });
  const { data: detail } = useUser(open && editingUser ? editingUser.id : null);

  const isEditing = Boolean(editingUser);
  const roles = rolePage?.items ?? [];
  const currentRoleIds = useMemo(() => (detail?.roles ?? []).map((r) => r.roleId), [detail]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema),
    defaultValues: { fullName: '', email: '', phone: '', position: '', isActive: true },
  });

  useEffect(() => {
    if (!open) return;
    setStep(1);
    setServerError(null);
    reset({
      fullName: editingUser?.fullName ?? '',
      email: editingUser?.email ?? '',
      phone: editingUser?.phone ?? '',
      position: editingUser?.position ?? '',
      isActive: editingUser?.isActive ?? true,
    });
    if (!editingUser) setSelectedRoleIds(new Set());
  }, [open, editingUser, reset]);

  useEffect(() => {
    if (open && detail) setSelectedRoleIds(new Set(detail.roles.map((r) => r.roleId)));
  }, [open, detail]);

  const goToRoles = handleSubmit(() => {
    setServerError(null);
    setStep(2);
  });

  const saveAll = handleSubmit(async (values) => {
    if (!branchId) return;
    setServerError(null);
    const body = {
      fullName: values.fullName,
      email: values.email,
      phone: values.phone || null,
      position: values.position || null,
      branchId,
      isActive: values.isActive,
    };

    try {
      if (isEditing) {
        await updateUser.mutateAsync({ id: editingUser!.id, body });
        await syncRoles.mutateAsync({
          userId: editingUser!.id,
          branchId,
          selectedRoleIds: Array.from(selectedRoleIds),
          currentRoleIds,
        });
        onOpenChange(false);
        return;
      }
      // Roles go in the create payload, so the account never exists role-less.
      const created = await createUser.mutateAsync({
        ...body,
        roleIds: Array.from(selectedRoleIds).map((roleId) => ({ roleId, branchId })),
      });
      onOpenChange(false);
      onCreated?.(created.user.email, created.temporary_password);
    } catch (error) {
      if (error instanceof ApiRequestError && error.code === 'DUPLICATE_EMAIL') {
        setServerError('Bu email artıq istifadə olunur.');
        setStep(1);
      } else if (error instanceof ApiRequestError && error.code === 'LAST_ADMIN') {
        setServerError('Sistemdə ən azı bir administrator qalmalıdır.');
      } else {
        setServerError(error instanceof Error ? error.message : 'Serverlə əlaqə qurulmadı.');
      }
    }
  });

  function toggleRole(roleId: string) {
    setSelectedRoleIds((prev) => {
      const next = new Set(prev);
      if (next.has(roleId)) next.delete(roleId);
      else next.add(roleId);
      return next;
    });
  }

  const saving = createUser.isPending || updateUser.isPending || syncRoles.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(step === 2 && 'max-w-xl')}>
        <DialogHeader>
          <DialogTitle>{isEditing ? 'İstifadəçini redaktə et' : 'Yeni istifadəçi'}</DialogTitle>
          <DialogDescription>
            {step === 1 ? 'Şəxsi məlumatlar və əlaqə' : 'Bu istifadəçiyə veriləcək rollar'}
          </DialogDescription>
        </DialogHeader>

        <div className="mb-4 flex items-center gap-3">
          <StepChip n={1} label="Məlumatlar" state={step === 1 ? 'on' : 'done'} />
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
          <StepChip n={2} label="Rollar" state={step === 2 ? 'on' : 'todo'} />
        </div>

        {serverError && (
          <div className="mb-4">
            <Alert variant="danger" title="Xəta">
              {serverError}
            </Alert>
          </div>
        )}

        {step === 1 && (
          <form onSubmit={goToRoles} noValidate>
            <Field>
              <Label htmlFor="user-name" required>
                Ad, soyad
              </Label>
              <Input id="user-name" error={Boolean(errors.fullName)} {...register('fullName')} />
              {errors.fullName && <FieldError>{errors.fullName.message}</FieldError>}
            </Field>

            <Field>
              <Label htmlFor="user-email" required>
                Email
              </Label>
              <Input id="user-email" type="email" error={Boolean(errors.email)} {...register('email')} />
              {errors.email ? (
                <FieldError>{errors.email.message}</FieldError>
              ) : (
                <FieldHint>Sistemə giriş üçün istifadə olunur.</FieldHint>
              )}
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field className="mb-0">
                <Label htmlFor="user-phone">Telefon</Label>
                <Input id="user-phone" placeholder="+994 50 000 00 00" {...register('phone')} />
              </Field>
              <Field className="mb-0">
                <Label htmlFor="user-position">Vəzifə</Label>
                <Input id="user-position" placeholder="Anbardar" {...register('position')} />
              </Field>
            </div>

            <Field className="mt-4">
              <Checkbox {...register('isActive')}>Aktiv</Checkbox>
              <FieldHint>Deaktiv istifadəçi sistemə giriş edə bilmir.</FieldHint>
            </Field>

            {!isEditing && (
              <Alert variant="info" title="Parol">
                Sistem müvəqqəti parol yaradacaq və yaratdıqdan sonra bir dəfə göstərəcək.
                İstifadəçi ilk girişdə onu dəyişməlidir.
              </Alert>
            )}

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
            {rolesLoading && <Skeleton className="h-40 w-full" />}
            {!rolesLoading && roles.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Hələ rol yaradılmayıb — istifadəçini rolsuz da yarada bilərsiniz.
              </p>
            )}
            {!rolesLoading && roles.length > 0 && (
              <div className="space-y-1.5">
                {roles.map((role) => (
                  <label
                    key={role.id}
                    className={cn(
                      'flex cursor-pointer items-center gap-2 rounded-lg border border-line px-3 py-2.5 transition-colors hover:bg-graphite-50',
                      selectedRoleIds.has(role.id) && 'border-gold bg-gold-50',
                    )}
                  >
                    <Checkbox
                      checked={selectedRoleIds.has(role.id)}
                      onChange={() => toggleRole(role.id)}
                    />
                    <span className="font-semibold">{role.name}</span>
                    <span className="mono text-xs text-muted-foreground">{role.code}</span>
                    {role.description && (
                      <span className="ml-auto truncate text-xs text-muted-foreground">
                        {role.description}
                      </span>
                    )}
                  </label>
                ))}
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setStep(1)}>
                Geri
              </Button>
              <Button type="button" variant="primary" loading={saving} onClick={saveAll}>
                {isEditing ? 'Yadda saxla' : 'İstifadəçi yarat'}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
