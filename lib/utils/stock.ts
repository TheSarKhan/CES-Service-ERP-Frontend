import type { InventoryItem, StockLocation } from '@/types/inventory';

/**
 * How much of a product sits in one folder.
 *
 * A product with no row for that folder isn't "unknown", it's zero — it simply isn't kept there.
 */
export function quantityAt(item: InventoryItem, nodeId: string | null | undefined): number {
  if (!nodeId) return 0;
  return item.locations.find((location) => location.nodeId === nodeId)?.quantity ?? 0;
}

/**
 * The folder a stock action should default to: the one you came from, or the only one the product
 * is kept in. Anything else is a guess, so the caller has to ask.
 */
export function defaultLocation(
  item: InventoryItem,
  contextNodeId?: string | null,
): StockLocation | null {
  if (contextNodeId) {
    const match = item.locations.find((location) => location.nodeId === contextNodeId);
    if (match) return match;
  }
  return item.locations.length === 1 ? item.locations[0] : null;
}

/** "Rəf A: 5 · Rəf C: 38" — the whole picture on one line. */
export function locationSummary(item: InventoryItem): string {
  if (item.locations.length === 0) return '—';
  return item.locations
    .map((location) => `${location.nodeName ?? 'Qovluq'}: ${location.quantity}`)
    .join(' · ');
}
