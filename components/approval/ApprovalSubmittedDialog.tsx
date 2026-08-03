'use client';

import { useRouter } from 'next/navigation';
import { ShieldCheck } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

/**
 * Confirms that a destructive action was parked rather than applied.
 *
 * Without this the UI would look like nothing happened: the dialog closes, the list is unchanged,
 * and the user has no idea their edit is queued. Every flow behind the approval queue shows it.
 */
export function ApprovalSubmittedDialog({
  open,
  onOpenChange,
  description,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** What was requested, e.g. "Məhsul silinməsi" — shown above the standing explanation. */
  description?: string;
}) {
  const router = useRouter();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Təsdiqə göndərildi</DialogTitle>
          <DialogDescription>
            Dəyişiklik hələ tətbiq olunmayıb — ikinci səlahiyyətli şəxs təsdiqlədikdən sonra icra
            ediləcək. Öz sorğunuzu özünüz təsdiqləyə bilməzsiniz.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-start gap-3 rounded-lg border border-line bg-graphite-50 p-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-gold" />
          <div className="text-sm">
            {description && <div className="font-semibold">{description}</div>}
            <div className="text-muted-foreground">
              Qərar verilənə qədər bu qeyd üzərində başqa dəyişiklik edilə bilməz.
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Bağla
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={() => {
              onOpenChange(false);
              router.push('/approvals');
            }}
          >
            Təsdiqləmələrə keç
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
