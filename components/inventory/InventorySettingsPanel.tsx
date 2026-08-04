'use client';

import { useEffect, useState } from 'react';
import { Mail, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label, Field, FieldHint } from '@/components/ui/label';
import { Alert } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { useInventorySettings, useUpdateInventorySettings } from '@/hooks/use-inventory';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Anbar tənzimləmələri — branch-level policy rather than stock, so it applies immediately instead
 * of going through the approval queue.
 *
 * The recipient list is typed by hand on purpose: the digest often needs to reach someone who has
 * no account at all, like whoever does the buying.
 */
export function InventorySettingsPanel() {
  const { data: settings, isLoading } = useInventorySettings();
  const updateSettings = useUpdateInventorySettings();

  const [emails, setEmails] = useState<string[]>([]);
  const [draft, setDraft] = useState('');
  const [digestEnabled, setDigestEnabled] = useState(true);
  const [strictTransfer, setStrictTransfer] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!settings) return;
    setEmails(settings.notificationEmails);
    setDigestEnabled(settings.dailyDigestEnabled);
    setStrictTransfer(settings.transferRequiresDifferentReceiver);
  }, [settings]);

  if (isLoading) return <Skeleton className="h-64 w-full" />;

  function addEmail() {
    const value = draft.trim().toLowerCase();
    setError(null);
    if (!EMAIL_PATTERN.test(value)) {
      setError('Düzgün email ünvanı daxil edin.');
      return;
    }
    if (emails.includes(value)) {
      setError('Bu ünvan artıq siyahıdadır.');
      return;
    }
    setEmails((prev) => [...prev, value]);
    setDraft('');
  }

  async function handleSave() {
    setError(null);
    setSaved(false);
    try {
      await updateSettings.mutateAsync({
        notificationEmails: emails,
        dailyDigestEnabled: digestEnabled,
        transferRequiresDifferentReceiver: strictTransfer,
      });
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Yadda saxlanılmadı.');
    }
  }

  return (
    <div className="max-w-2xl">
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
            Tənzimləmələr yeniləndi.
          </Alert>
        </div>
      )}

      {/* Saying this up front beats letting somebody type addresses and wait for mail that was
          never going to be sent. */}
      {settings && !settings.mailConfigured && (
        <div className="mb-4">
          <Alert variant="warn" title="Poçt serveri qurulmayıb">
            Ünvanları indi yaza bilərsiniz, amma serverdə SMTP konfiqurasiyası olmayana qədər
            məktub göndərilməyəcək.
          </Alert>
        </div>
      )}

      <div className="mb-5 rounded-lg border border-line p-4">
        <div className="mb-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
          <Mail className="h-3.5 w-3.5 text-gold" />
          Gündəlik stok xülasəsi
        </div>

        <Field>
          <Checkbox
            checked={digestEnabled}
            onChange={(e) => setDigestEnabled(e.target.checked)}
          >
            Hər səhər saat 08:00-da göndərilsin
          </Checkbox>
          <FieldHint>
            Yalnız həddən aşağı düşən məhsul olduqda göndərilir — hər gün «hər şey qaydasındadır»
            məktubu oxunmamağa öyrədir.
          </FieldHint>
        </Field>

        <Label>Alıcı ünvanlar</Label>
        {emails.length === 0 ? (
          <p className="mb-2 text-sm text-muted-foreground">
            Ünvan əlavə edilməyib — heç kimə göndərilmir.
          </p>
        ) : (
          <ul className="mb-2 space-y-1">
            {emails.map((email) => (
              <li
                key={email}
                className="flex items-center justify-between rounded-lg border border-line px-3 py-2 text-sm"
              >
                <span className="mono">{email}</span>
                <button
                  type="button"
                  onClick={() => setEmails((prev) => prev.filter((e) => e !== email))}
                  className="btn btn-ghost btn-icon"
                  aria-label={`${email} ünvanını sil`}
                >
                  <X className="h-4 w-4 text-danger" />
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="flex items-center gap-2">
          <Input
            inputSize="sm"
            type="email"
            placeholder="anbar@sirket.az"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addEmail();
              }
            }}
          />
          <Button variant="outline" size="sm" onClick={addEmail}>
            <Plus className="h-4 w-4" />
            Əlavə et
          </Button>
        </div>
      </div>

      <div className="mb-5 rounded-lg border border-line p-4">
        <div className="mb-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">
          Transfer
        </div>
        <Field className="mb-0">
          <Checkbox
            checked={strictTransfer}
            onChange={(e) => setStrictTransfer(e.target.checked)}
          >
            Transferi göndərəndən başqa şəxs qəbul etməlidir
          </Checkbox>
          <FieldHint>
            Söndürsəniz, tək anbardarla işləyən filialda transfer bloklanmır — əvəzində «göndərdim,
            özüm də qəbul etdim» mümkün olur.
          </FieldHint>
        </Field>
      </div>

      <div className="flex justify-end">
        <Button variant="primary" loading={updateSettings.isPending} onClick={handleSave}>
          Yadda saxla
        </Button>
      </div>
    </div>
  );
}
