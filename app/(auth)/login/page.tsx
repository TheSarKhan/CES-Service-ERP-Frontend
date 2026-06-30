'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Mail, Lock } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { ApiRequestError } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label, Field, FieldError } from '@/components/ui/label';
import { Alert } from '@/components/ui/alert';
import { LogoTile } from '@/components/layout/LogoTile';

const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'E-poçt tələb olunur')
    .email('Düzgün e-poçt ünvanı daxil edin'),
  password: z.string().min(1, 'Şifrə tələb olunur'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const { login } = useAuth();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (values: LoginFormValues) => {
    setServerError(null);
    try {
      await login(values);
      // useAuth.login handles redirect + default branch selection.
    } catch (error) {
      if (error instanceof ApiRequestError) {
        setServerError(
          error.code === 'AUTH_INVALID_CREDENTIALS'
            ? 'E-poçt və ya şifrə yanlışdır'
            : error.message,
        );
      } else {
        setServerError('Serverlə əlaqə qurulmadı. Yenidən cəhd edin.');
      }
    }
  };

  return (
    <div className="grid min-h-screen place-items-center bg-background px-4">
      <div className="card-basic w-full max-w-md" style={{ padding: 32 }}>
        {/* Brand */}
        <div className="mb-7 flex flex-col items-center gap-3 text-center">
          <LogoTile size={56} />
          <div>
            <div className="text-xl font-extrabold leading-tight">
              Construction <span className="text-gold">Equipment</span> Services
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Sistemə daxil olmaq üçün giriş edin
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <Field>
            <Label htmlFor="email" required>
              E-poçt
            </Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="ad@ces.az"
              icon={<Mail className="h-4 w-4" />}
              error={Boolean(errors.email)}
              {...register('email')}
            />
            {errors.email && <FieldError>{errors.email.message}</FieldError>}
          </Field>

          <Field>
            <Label htmlFor="password" required>
              Şifrə
            </Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              icon={<Lock className="h-4 w-4" />}
              error={Boolean(errors.password)}
              {...register('password')}
            />
            {errors.password && (
              <FieldError>{errors.password.message}</FieldError>
            )}
          </Field>

          {serverError && (
            <div className="mb-4">
              <Alert variant="danger" title="Giriş alınmadı">
                {serverError}
              </Alert>
            </div>
          )}

          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full justify-center"
            loading={isSubmitting}
          >
            Daxil ol
          </Button>
        </form>
      </div>
    </div>
  );
}
