import { apiDelete, apiGet, apiPatch, apiPost, apiPostForm, apiPut } from './client';
import type { PageMeta, PageResponse } from '@/types/api';
import type {
  InventoryCategory,
  InventoryCategoryField,
  InventoryCategoryFieldRequest,
  InventoryCategoryRequest,
  InventoryItem,
  InventoryItemListParams,
  InventoryItemRequest,
  InventoryItemUnit,
  InventoryItemUnitBatchCreateRequest,
  InventoryItemUnitUpdateRequest,
  InventoryLookupResult,
  InventoryNode,
  InventoryNodeRequest,
  InventoryUnitSearchParams,
  StockQuantityRequest,
} from '@/types/inventory';

/**
 * Inventory (Stok İdarəetməsi) API surface. List endpoints nest `{ content, meta }` under `data`
 * (see lib/api/roles.ts for why this doesn't go through the shared `apiList` helper).
 */

interface RawPage<T> {
  content: T[];
  meta: PageMeta;
}

// ── Layer nodes ──────────────────────────────────────────────────────────

/** GET /api/v1/inventory/nodes — children of parentId, or roots when omitted. */
export async function getInventoryNodeChildren(parentId?: string): Promise<InventoryNode[]> {
  return apiGet<InventoryNode[]>('/inventory/nodes', parentId ? { parentId } : undefined);
}

export async function getInventoryNode(id: string): Promise<InventoryNode> {
  return apiGet<InventoryNode>(`/inventory/nodes/${id}`);
}

export async function createInventoryNode(body: InventoryNodeRequest): Promise<InventoryNode> {
  return apiPost<InventoryNode>('/inventory/nodes', body);
}

export async function updateInventoryNode(id: string, body: InventoryNodeRequest): Promise<InventoryNode> {
  return apiPut<InventoryNode>(`/inventory/nodes/${id}`, body);
}

export async function deleteInventoryNode(id: string): Promise<void> {
  return apiDelete(`/inventory/nodes/${id}`);
}

// ── Categories ───────────────────────────────────────────────────────────

export async function getInventoryCategories(): Promise<InventoryCategory[]> {
  return apiGet<InventoryCategory[]>('/inventory/categories');
}

export async function getInventoryCategory(id: string): Promise<InventoryCategory> {
  return apiGet<InventoryCategory>(`/inventory/categories/${id}`);
}

export async function createInventoryCategory(body: InventoryCategoryRequest): Promise<InventoryCategory> {
  return apiPost<InventoryCategory>('/inventory/categories', body);
}

export async function updateInventoryCategory(
  id: string,
  body: InventoryCategoryRequest,
): Promise<InventoryCategory> {
  return apiPut<InventoryCategory>(`/inventory/categories/${id}`, body);
}

export async function deleteInventoryCategory(id: string): Promise<void> {
  return apiDelete(`/inventory/categories/${id}`);
}

export async function addInventoryCategoryField(
  categoryId: string,
  body: InventoryCategoryFieldRequest,
): Promise<InventoryCategoryField> {
  return apiPost<InventoryCategoryField>(`/inventory/categories/${categoryId}/fields`, body);
}

export async function updateInventoryCategoryField(
  categoryId: string,
  fieldId: string,
  body: InventoryCategoryFieldRequest,
): Promise<InventoryCategoryField> {
  return apiPut<InventoryCategoryField>(`/inventory/categories/${categoryId}/fields/${fieldId}`, body);
}

export async function removeInventoryCategoryField(categoryId: string, fieldId: string): Promise<void> {
  return apiDelete(`/inventory/categories/${categoryId}/fields/${fieldId}`);
}

/** New field order for a category — array position becomes sort_order. */
export async function reorderInventoryCategoryFields(
  categoryId: string,
  fieldIds: string[],
): Promise<InventoryCategoryField[]> {
  return apiPatch<InventoryCategoryField[]>(`/inventory/categories/${categoryId}/fields/reorder`, { fieldIds });
}

/** Uploads an image for an IMAGE / MULTI_IMAGE dynamic field, returning its servable URL. */
export async function uploadInventoryImage(file: File): Promise<{ url: string }> {
  const formData = new FormData();
  formData.append('file', file);
  return apiPostForm<{ url: string }>('/inventory/uploads', formData);
}

// ── Items ────────────────────────────────────────────────────────────────

export async function getInventoryItems(
  params: InventoryItemListParams = {},
): Promise<PageResponse<InventoryItem>> {
  const page = await apiGet<RawPage<InventoryItem>>('/inventory/items', params);
  return { items: page.content, meta: page.meta };
}

export async function getInventoryItem(id: string): Promise<InventoryItem> {
  return apiGet<InventoryItem>(`/inventory/items/${id}`);
}

export async function createInventoryItem(body: InventoryItemRequest): Promise<InventoryItem> {
  return apiPost<InventoryItem>('/inventory/items', body);
}

export async function updateInventoryItem(id: string, body: InventoryItemRequest): Promise<InventoryItem> {
  return apiPut<InventoryItem>(`/inventory/items/${id}`, body);
}

export async function deleteInventoryItem(id: string): Promise<void> {
  return apiDelete(`/inventory/items/${id}`);
}

export async function moveInventoryItem(id: string, nodeId: string): Promise<InventoryItem> {
  return apiPost<InventoryItem>(`/inventory/items/${id}/move`, { nodeId });
}

export async function stockInInventoryItem(id: string, body: StockQuantityRequest): Promise<InventoryItem> {
  return apiPost<InventoryItem>(`/inventory/items/${id}/stock-in`, body);
}

export async function stockOutInventoryItem(id: string, body: StockQuantityRequest): Promise<InventoryItem> {
  return apiPost<InventoryItem>(`/inventory/items/${id}/stock-out`, body);
}

export async function adjustInventoryItem(id: string, body: StockQuantityRequest): Promise<InventoryItem> {
  return apiPost<InventoryItem>(`/inventory/items/${id}/adjust`, body);
}

// ── Serialized units / warranty ─────────────────────────────────────────

export async function getInventoryItemUnits(itemId: string): Promise<InventoryItemUnit[]> {
  return apiGet<InventoryItemUnit[]>(`/inventory/items/${itemId}/units`);
}

export async function createInventoryItemUnitBatch(
  itemId: string,
  body: InventoryItemUnitBatchCreateRequest,
): Promise<InventoryItemUnit[]> {
  return apiPost<InventoryItemUnit[]>(`/inventory/items/${itemId}/units`, body);
}

/** GET /api/v1/inventory/item-units — warranty / general search across all units. */
export async function searchInventoryItemUnits(
  params: InventoryUnitSearchParams = {},
): Promise<PageResponse<InventoryItemUnit>> {
  const page = await apiGet<RawPage<InventoryItemUnit>>('/inventory/item-units', params);
  return { items: page.content, meta: page.meta };
}

export async function getInventoryItemUnit(id: string): Promise<InventoryItemUnit> {
  return apiGet<InventoryItemUnit>(`/inventory/item-units/${id}`);
}

export async function updateInventoryItemUnit(
  id: string,
  body: InventoryItemUnitUpdateRequest,
): Promise<InventoryItemUnit> {
  return apiPut<InventoryItemUnit>(`/inventory/item-units/${id}`, body);
}

export async function markInventoryItemUnitFailed(
  id: string,
  failureNotes?: string,
): Promise<InventoryItemUnit> {
  return apiPost<InventoryItemUnit>(`/inventory/item-units/${id}/fail`, { failureNotes });
}

export async function deleteInventoryItemUnit(id: string): Promise<void> {
  return apiDelete(`/inventory/item-units/${id}`);
}

// ── QR / barcode lookup ──────────────────────────────────────────────────

export async function lookupInventoryCode(code: string): Promise<InventoryLookupResult> {
  return apiGet<InventoryLookupResult>('/inventory/lookup', { code });
}
