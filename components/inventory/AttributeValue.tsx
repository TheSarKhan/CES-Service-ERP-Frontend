import { Package } from 'lucide-react';
import type { InventoryFieldType } from '@/types/inventory';

/**
 * Read-only rendering of one dynamic-field value, shared by any view that shows item attributes.
 *
 * `variant` only changes how images are presented: a table row needs a thumbnail that keeps the
 * row height sane, while a detail dialog has the room to show every image at a readable size.
 */
export function renderAttributeValue(
  fieldType: InventoryFieldType,
  value: unknown,
  variant: 'table' | 'detail' = 'table',
) {
  if (value === null || value === undefined || value === '') {
    return <span className="text-muted-foreground">—</span>;
  }
  if (fieldType === 'IMAGE' && typeof value === 'string') {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={value}
        alt=""
        className={
          variant === 'detail'
            ? 'h-28 w-28 rounded-lg border border-line object-cover'
            : 'h-8 w-8 rounded object-cover'
        }
      />
    );
  }
  if (fieldType === 'MULTI_IMAGE' && Array.isArray(value)) {
    const urls = value as string[];
    if (variant === 'detail') {
      return (
        <div className="flex flex-wrap gap-2">
          {urls.map((url, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={`${url}-${i}`}
              src={url}
              alt=""
              className="h-24 w-24 rounded-lg border border-line object-cover"
            />
          ))}
        </div>
      );
    }
    return (
      <div className="flex items-center -space-x-2">
        {urls.slice(0, 3).map((url, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={`${url}-${i}`}
            src={url}
            alt=""
            className="h-8 w-8 rounded-full border-2 border-white object-cover"
          />
        ))}
        {urls.length > 3 && (
          <span className="pl-3 text-xs text-muted-foreground">+{urls.length - 3}</span>
        )}
      </div>
    );
  }
  return <span className={variant === 'detail' ? 'whitespace-pre-wrap' : undefined}>{String(value)}</span>;
}

/** "Ad" column cell — the product photo (Şəkil system field) shown inline with its name. */
export function ItemNameCell({ name, imageUrl }: { name: string; imageUrl?: string | null }) {
  return (
    <div className="flex items-center gap-2">
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl} alt="" className="h-8 w-8 shrink-0 rounded object-cover" />
      ) : (
        <div className="grid h-8 w-8 shrink-0 place-items-center rounded bg-graphite-50 text-muted-foreground">
          <Package className="h-4 w-4" />
        </div>
      )}
      <span className="font-semibold">{name}</span>
    </div>
  );
}
