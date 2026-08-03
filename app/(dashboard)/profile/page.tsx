'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { KeyRound, ShieldCheck } from 'lucide-react';
import { TableWrap } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label, Field, FieldError, FieldHint } from '@/components/ui/label';
import { Alert } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { ChangePasswordDialog } from '@/components/users/ChangePasswordDialog';
import { useOwnProfile, useUpdateOwnProfile } from '@/hooks/use-users';
import { formatDateTime } from '@/lib/utils/format';

const profileSchema = z.object({
  fullName: z.string().min(1, 'Ad tələb olunur').max(255),
  phone: z.string().max(50).optional(),
  position: z.string().max(100).optional(),
});

type ProfileValues = z.infer<typeof profileSchema>;

/**
 * "Profilim" — the only screen a user edits about themselves.
 *
 * Email, roles, branch and active state are shown read-only: they define access, so they stay
 * with an administrator rather than being self-serve.
 */
export default function ProfilePage() {
  const { data: profile, isLoading } = useOwnProfile();
  const updateProfile = useUpdateOwnProfile();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [passwordOpen, setPasswordOpen] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { fullName: '', phone: '', position: '' },
  });

  useEffect(() => {
    if (profile) {
      reset({
        fullName: profile.fullName,
        phone: profile.phone ?? '',
        position: profile.position ?? '',
      });
    }
  }, [profile, reset]);

  const onSubmit = async (values: ProfileValues) => {
    setError(null);
    setSaved(false);
    try {
      await updateProfile.mutateAsync({
        fullName: values.fullName,
        phone: values.phone || null,
        position: values.position || null,
      });
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Yadda saxlanılmadı.');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Profilim</h1>
        <p className="text-sm text-muted-foreground">Şəxsi məlumatlar və parol</p>
      </div>

      {isLoading && <Skeleton className="h-64 w-full" />}

      {!isLoading && profile && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
          <TableWrap className="p-4">
            <h3 className="mb-4 text-base font-bold">Məlumatlarım</h3>

            {error && (
              <div className="mb-3">
                <Alert variant="danger" title="Xəta">
                  {error}
                </Alert>
              </div>
            )}
            {saved && (
              <div className="mb-3">
                <Alert variant="ok" title="Yadda saxlanıldı">
                  Məlumatlarınız yeniləndi.
                </Alert>
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} noValidate>
              <Field>
                <Label htmlFor="profile-name" required>
                  Ad, soyad
                </Label>
                <Input id="profile-name" error={Boolean(errors.fullName)} {...register('fullName')} />
                {errors.fullName && <FieldError>{errors.fullName.message}</FieldError>}
              </Field>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field className="mb-0">
                  <Label htmlFor="profile-phone">Telefon</Label>
                  <Input id="profile-phone" {...register('phone')} />
                </Field>
                <Field className="mb-0">
                  <Label htmlFor="profile-position">Vəzifə</Label>
                  <Input id="profile-position" {...register('position')} />
                </Field>
              </div>

              <Field className="mt-4">
                <Label htmlFor="profile-email">Email</Label>
                <Input id="profile-email" value={profile.email} disabled readOnly />
                <FieldHint>Email yalnız administrator tərəfindən dəyişdirilir.</FieldHint>
              </Field>

              <div className="mt-5 flex justify-end">
                <Button type="submit" variant="primary" loading={isSubmitting}>
                  Yadda saxla
                </Button>
              </div>
            </form>
          </TableWrap>

          <div className="space-y-4">
            <TableWrap className="p-4">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-bold">
                <ShieldCheck className="h-4 w-4 text-gold" />
                Rollarım
              </h3>
              {profile.roles.length === 0 ? (
                <p className="text-sm text-muted-foreground">Rol təyin edilməyib.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {profile.roles.map((r) => (
                    <Badge key={`${r.roleId}-${r.branchId}`} variant="gold" size="sm">
                      {r.roleName}
                    </Badge>
                  ))}
                </div>
              )}
              <p className="mt-3 text-xs text-muted-foreground">
                Son giriş: {profile.lastLoginAt ? formatDateTime(profile.lastLoginAt) : 'heç vaxt'}
              </p>
            </TableWrap>

            <TableWrap className="p-4">
              <h3 className="mb-2 text-sm font-bold">Təhlükəsizlik</h3>
              <p className="mb-3 text-sm text-muted-foreground">
                Parolunuzu istənilən vaxt dəyişə bilərsiniz.
              </p>
              <Button variant="outline" size="sm" onClick={() => setPasswordOpen(true)}>
                <KeyRound className="h-4 w-4" />
                Parolu dəyiş
              </Button>
            </TableWrap>
          </div>
        </div>
      )}

      <ChangePasswordDialog open={passwordOpen} onOpenChange={setPasswordOpen} />
    </div>
  );
}
