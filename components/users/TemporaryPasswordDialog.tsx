'use client';

import { useState } from 'react';
import { Check, Copy, KeyRound } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';

/**
 * Shows a freshly issued temporary password.
 *
 * This is the only time it is readable — the server stores just the hash — so the dialog is
 * deliberately blunt about copying it now, and the copy button exists because the password is
 * built from look-alike-free characters precisely so it can be passed along by hand.
 */
export function TemporaryPasswordDialog({
  open,
  onOpenChange,
  email,
  password,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  email: string;
  password: string | null;
}) {
  const [copied, setCopied] = useState(false);

  if (!password) return null;

  async function copy() {
    await navigator.clipboard.writeText(password as string);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Müvəqqəti parol</DialogTitle>
          <DialogDescription>{email}</DialogDescription>
        </DialogHeader>

        <Alert variant="warn" title="Bu parol bir daha göstərilməyəcək">
          İndi kopyalayıb istifadəçiyə verin. O, ilk girişdən sonra parolu dəyişməyə
          yönləndiriləcək.
        </Alert>

        <div className="mt-3 flex items-center gap-2 rounded-lg border border-line bg-graphite-50 p-3">
          <KeyRound className="h-4 w-4 shrink-0 text-gold" />
          <code className="mono flex-1 select-all text-base font-bold tracking-wide">
            {password}
          </code>
          <Button type="button" variant="outline" size="xs" onClick={copy}>
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? 'Kopyalandı' : 'Kopyala'}
          </Button>
        </div>

        <DialogFooter>
          <Button type="button" variant="primary" onClick={() => onOpenChange(false)}>
            Bağla
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
