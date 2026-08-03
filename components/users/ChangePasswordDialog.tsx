'use client';

import { useEffect, useState } from 'react';
import { KeyRound } from 'lucide-react';
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
import { Label, Field, FieldError, FieldHint } from '@/components/ui/label';
import { Alert } from '@/components/ui/alert';
import { useChangeOwnPassword } from '@/hooks/use-users';
import { ApiRequestError } from '@/lib/api/client';

/**
 * "Parolu dəyiş". When `forced` (the account still holds an admin-issued temporary password) the
 * dialog cannot be dismissed — leaving it open would let the person keep working on a password
 * someone else knows.
 */
export function ChangePasswordDialog({
  open,
  onOpenChange,
  forced = false,
  onChanged,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  forced?: boolean;
  onChanged?: () => void;
}) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [repeat, setRepeat] = useState('');
  const [error, setError] = useState<string | null>(null);
  const changePassword = useChangeOwnPassword();

  useEffect(() => {
    if (open) {
      setCurrentPassword('');
      setNewPassword('');
      setRepeat('');
      setError(null);
    }
  }, [open]);

  async function handleSubmit() {
    setError(null);
    if (newPassword !== repeat) {
      setError('Yeni parollar üst-üstə düşmür.');
      return;
    }
    try {
      await changePassword.mutateAsync({ currentPassword, newPassword });
      onChanged?.();
      onOpenChange(false);
    } catch (err) {
      if (err instanceof ApiRequestError && err.code === 'AUTH_INVALID_CREDENTIALS') {
        setError('Cari parol yanlışdır.');
      } else if (err instanceof ApiRequestError && err.code === 'WEAK_PASSWORD') {
        setError('Parol ən azı 8 simvol, bir böyük hərf və bir rəqəm olmalıdır.');
      } else {
        setError('Parol dəyişdirilmədi.');
      }
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (forced && !next) return;
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-w-md" hideClose={forced}>
        <DialogHeader>
          <DialogTitle>{forced ? 'Parolu dəyişin' : 'Parolu dəyiş'}</DialogTitle>
          <DialogDescription>
            {forced
              ? 'Hesabınız müvəqqəti parolla açılıb — davam etmək üçün öz parolunuzu təyin edin.'
              : 'Cari parolunuzu təsdiqləyib yenisini təyin edin.'}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="mb-3">
            <Alert variant="danger" title="Xəta">
              {error}
            </Alert>
          </div>
        )}

        <Field>
          <Label htmlFor="cur-pass" required>
            Cari parol
          </Label>
          <Input
            id="cur-pass"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            autoFocus
          />
        </Field>

        <Field>
          <Label htmlFor="new-pass" required>
            Yeni parol
          </Label>
          <Input
            id="new-pass"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <FieldHint>Ən azı 8 simvol, bir böyük hərf və bir rəqəm.</FieldHint>
        </Field>

        <Field>
          <Label htmlFor="rep-pass" required>
            Yeni parol (təkrar)
          </Label>
          <Input
            id="rep-pass"
            type="password"
            value={repeat}
            onChange={(e) => setRepeat(e.target.value)}
            error={Boolean(repeat) && repeat !== newPassword}
          />
          {Boolean(repeat) && repeat !== newPassword && (
            <FieldError>Parollar üst-üstə düşmür.</FieldError>
          )}
        </Field>

        <DialogFooter>
          {!forced && (
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Ləğv et
            </Button>
          )}
          <Button
            type="button"
            variant="primary"
            loading={changePassword.isPending}
            disabled={!currentPassword || !newPassword || !repeat}
            onClick={handleSubmit}
          >
            <KeyRound className="h-4 w-4" />
            Parolu dəyiş
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
