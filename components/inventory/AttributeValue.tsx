import type { InventoryFieldType } from '@/types/inventory';

/** Read-only rendering of one dynamic-field value, shared by any table that shows item attributes. */
export function renderAttributeValue(fieldType: InventoryFieldType, value: unknown) {
  if (value === null || value === undefined || value === '') {
    return <span className="text-muted-foreground">—</span>;
  }
  if (fieldType === 'IMAGE' && typeof value === 'string') {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={value} alt="" className="h-8 w-8 rounded object-cover" />;
  }
  if (fieldType === 'MULTI_IMAGE' && Array.isArray(value)) {
    const urls = value as string[];
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
  return <span>{String(value)}</span>;
}
