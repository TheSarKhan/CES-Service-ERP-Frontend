'use client';

import { useRef, useState } from 'react';
import { ImagePlus, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useUploadInventoryImage } from '@/hooks/use-inventory';
import type { InventoryCategoryField } from '@/types/inventory';

export interface DynamicFieldInputProps {
  field: InventoryCategoryField;
  value: unknown;
  onChange: (value: unknown) => void;
}

/** Renders one form control for a category's dynamic field, based on its `fieldType`. */
export function DynamicFieldInput({ field, value, onChange }: DynamicFieldInputProps) {
  switch (field.fieldType) {
    case 'NUMBER':
      return (
        <Input
          type="number"
          placeholder={field.placeholder ?? undefined}
          value={value === null || value === undefined ? '' : String(value)}
          onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
        />
      );

    case 'DATE':
      return (
        <Input
          type="date"
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => onChange(e.target.value || null)}
        />
      );

    case 'TEXTAREA':
      return (
        <Textarea
          placeholder={field.placeholder ?? undefined}
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => onChange(e.target.value || null)}
        />
      );

    case 'IMAGE':
      return <SingleImageField value={typeof value === 'string' ? value : null} onChange={onChange} />;

    case 'MULTI_IMAGE':
      return (
        <MultiImageField value={Array.isArray(value) ? (value as string[]) : []} onChange={onChange} />
      );

    case 'TEXT':
    default:
      return (
        <Input
          type="text"
          placeholder={field.placeholder ?? undefined}
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => onChange(e.target.value || null)}
        />
      );
  }
}

function SingleImageField({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (value: string | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const upload = useUploadInventoryImage();

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setError(null);
    try {
      const { url } = await upload.mutateAsync(file);
      onChange(url);
    } catch {
      setError('Şəkil yüklənmədi.');
    }
  }

  return (
    <div>
      <div className="flex items-center gap-3">
        {value && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="" className="h-20 w-20 rounded-lg border border-line object-cover" />
        )}
        <Button
          type="button"
          variant="outline"
          size="sm"
          loading={upload.isPending}
          onClick={() => inputRef.current?.click()}
        >
          <ImagePlus className="h-4 w-4" />
          {value ? 'Dəyiş' : 'Şəkil seç'}
        </Button>
        {value && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="btn btn-ghost btn-icon"
            aria-label="Şəkli sil"
          >
            <X className="h-4 w-4 text-danger" />
          </button>
        )}
      </div>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      {error && <p className="mt-1 text-xs text-danger">{error}</p>}
    </div>
  );
}

function MultiImageField({
  value,
  onChange,
}: {
  value: string[];
  onChange: (value: string[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const upload = useUploadInventoryImage();

  async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (files.length === 0) return;
    setError(null);
    try {
      const urls = await Promise.all(files.map((file) => upload.mutateAsync(file).then((r) => r.url)));
      onChange([...value, ...urls]);
    } catch {
      setError('Bəzi şəkillər yüklənmədi.');
    }
  }

  function removeAt(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {value.map((url, i) => (
          // eslint-disable-next-line react/no-array-index-key
          <div key={`${url}-${i}`} className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt="" className="h-16 w-16 rounded-lg border border-line object-cover" />
            <button
              type="button"
              onClick={() => removeAt(i)}
              className="absolute -right-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full bg-danger text-white"
              aria-label="Şəkli sil"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={upload.isPending}
          className="grid h-16 w-16 place-items-center rounded-lg border border-dashed border-line text-muted-foreground hover:border-gold hover:text-gold"
          aria-label="Şəkil əlavə et"
        >
          <ImagePlus className="h-5 w-5" />
        </button>
      </div>
      <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFiles} />
      {upload.isPending && <p className="mt-1 text-xs text-muted-foreground">Yüklənir...</p>}
      {error && <p className="mt-1 text-xs text-danger">{error}</p>}
    </div>
  );
}
