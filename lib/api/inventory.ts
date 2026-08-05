import { apiDelete, apiGet, apiPatch, apiPost, apiPostForm, apiPut } from './client';
import type { PageMeta, PageResponse } from '@/types/api';
import type { ApprovalRequest } from '@/types/approval';
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
  InventorySettings,
  InventorySettingsRequest,
  InventoryUnitSearchParams,
  InventoryLot,
  InventoryLotRequest,
  StockAlertSummary,
  StockMovement,
  StockMovementParams,
  StockQuantityRequest,
  WarrantyClaim,
  WarrantyClaimDecisionRequest,
  WarrantyClaimListParams,
  WarrantyClaimRequest,
  WarrantyExtendRequest,
  WarrantyExtension,
  WarrantyRecord,
  WarrantyRecordSearchParams,
  WarrantySummary,
  WarrantyTargetType,
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

/** Root-first ancestor chain (including the node itself) — powers "jump to location". */
export async function getInventoryNodePath(id: string): Promise<InventoryNode[]> {
  return apiGet<InventoryNode[]>(`/inventory/nodes/${id}/path`);
}

export async function createInventoryNode(body: InventoryNodeRequest): Promise<InventoryNode> {
  return apiPost<InventoryNode>('/inventory/nodes', body);
}

export async function updateInventoryNode(id: string, body: InventoryNodeRequest): Promise<ApprovalRequest> {
  return apiPut<ApprovalRequest>(`/inventory/nodes/${id}`, body);
}

export async function deleteInventoryNode(id: string): Promise<ApprovalRequest> {
  return apiDelete<ApprovalRequest>(`/inventory/nodes/${id}`);
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
): Promise<ApprovalRequest> {
  return apiPut<ApprovalRequest>(`/inventory/categories/${id}`, body);
}

export async function deleteInventoryCategory(id: string): Promise<ApprovalRequest> {
  return apiDelete<ApprovalRequest>(`/inventory/categories/${id}`);
}

export async function addInventoryCategoryField(
  categoryId: string,
  body: InventoryCategoryFieldRequest,
): Promise<ApprovalRequest> {
  return apiPost<ApprovalRequest>(`/inventory/categories/${categoryId}/fields`, body);
}

export async function updateInventoryCategoryField(
  categoryId: string,
  fieldId: string,
  body: InventoryCategoryFieldRequest,
): Promise<ApprovalRequest> {
  return apiPut<ApprovalRequest>(`/inventory/categories/${categoryId}/fields/${fieldId}`, body);
}

export async function removeInventoryCategoryField(categoryId: string, fieldId: string): Promise<ApprovalRequest> {
  return apiDelete<ApprovalRequest>(`/inventory/categories/${categoryId}/fields/${fieldId}`);
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

/** Distinct category ids actually present at a node — powers per-category section rendering. */
export async function getInventoryItemCategoryIds(nodeId: string): Promise<string[]> {
  return apiGet<string[]>('/inventory/items/category-ids', { nodeId });
}

export async function createInventoryItem(body: InventoryItemRequest): Promise<InventoryItem> {
  return apiPost<InventoryItem>('/inventory/items', body);
}

export async function updateInventoryItem(id: string, body: InventoryItemRequest): Promise<ApprovalRequest> {
  return apiPut<ApprovalRequest>(`/inventory/items/${id}`, body);
}

export async function deleteInventoryItem(id: string): Promise<ApprovalRequest> {
  return apiDelete<ApprovalRequest>(`/inventory/items/${id}`);
}

/**
 * Relocates stock from one folder to another; the source must be named.
 *
 * `quantity` omitted means the whole balance — which is also what a serialized product requires,
 * since there the units are what move.
 */
export async function moveInventoryItem(
  id: string,
  fromNodeId: string,
  toNodeId: string,
  quantity?: number,
): Promise<ApprovalRequest> {
  return apiPost<ApprovalRequest>(`/inventory/items/${id}/move`, { fromNodeId, toNodeId, quantity });
}

export async function stockInInventoryItem(id: string, body: StockQuantityRequest): Promise<ApprovalRequest> {
  return apiPost<ApprovalRequest>(`/inventory/items/${id}/stock-in`, body);
}

export async function stockOutInventoryItem(id: string, body: StockQuantityRequest): Promise<ApprovalRequest> {
  return apiPost<ApprovalRequest>(`/inventory/items/${id}/stock-out`, body);
}

export async function adjustInventoryItem(id: string, body: StockQuantityRequest): Promise<ApprovalRequest> {
  return apiPost<ApprovalRequest>(`/inventory/items/${id}/adjust`, body);
}

// ── Stock alerts & settings ──────────────────────────────────────────────

export async function getStockAlertSummary(): Promise<StockAlertSummary> {
  return apiGet<StockAlertSummary>('/inventory/stock-alerts/summary');
}

/** Products at or below their threshold, worst shortfall first. */
export async function getLowStockItems(
  params: {
    criticalOnly?: boolean;
    page?: number;
    size?: number;
    sort?: string;
    dir?: 'asc' | 'desc';
  } = {},
): Promise<PageResponse<InventoryItem>> {
  const page = await apiGet<RawPage<InventoryItem>>('/inventory/stock-alerts', params);
  return { items: page.content, meta: page.meta };
}

export async function getInventorySettings(): Promise<InventorySettings> {
  return apiGet<InventorySettings>('/inventory/settings');
}

export async function updateInventorySettings(
  body: InventorySettingsRequest,
): Promise<InventorySettings> {
  return apiPut<InventorySettings>('/inventory/settings', body);
}

// ── Lots / expiry ────────────────────────────────────────────────────────

export async function getItemLots(itemId: string): Promise<InventoryLot[]> {
  return apiGet<InventoryLot[]>(`/inventory/items/${itemId}/lots`);
}

/** The batch FEFO would pick at a folder; null when there is nothing to pick. */
export async function getLotSuggestion(
  itemId: string,
  nodeId: string,
): Promise<InventoryLot | null> {
  return apiGet<InventoryLot | null>(`/inventory/items/${itemId}/lots/suggestion`, { nodeId });
}

export async function receiveLot(
  itemId: string,
  body: InventoryLotRequest,
): Promise<InventoryLot> {
  return apiPost<InventoryLot>(`/inventory/items/${itemId}/lots`, body);
}

export async function consumeLot(
  lotId: string,
  quantity: number,
  reason?: string,
): Promise<InventoryLot> {
  return apiPost<InventoryLot>(`/inventory/lots/${lotId}/consume`, { quantity, reason });
}

export async function writeOffLot(lotId: string, reason?: string): Promise<void> {
  const query = reason ? `?reason=${encodeURIComponent(reason)}` : '';
  return apiDelete(`/inventory/lots/${lotId}${query}`);
}

export async function getExpiringLots(
  params: {
    withinDays?: number;
    page?: number;
    size?: number;
    sort?: string;
    dir?: 'asc' | 'desc';
  } = {},
): Promise<PageResponse<InventoryLot>> {
  const page = await apiGet<RawPage<InventoryLot>>('/inventory/lots/expiring', params);
  return { items: page.content, meta: page.meta };
}

// ── Stock movements ──────────────────────────────────────────────────────

/** GET /api/v1/inventory/stock-movements — the ledger, newest first. */
export async function getStockMovements(
  params: StockMovementParams = {},
): Promise<PageResponse<StockMovement>> {
  const page = await apiGet<RawPage<StockMovement>>('/inventory/stock-movements', params);
  return { items: page.content, meta: page.meta };
}

// ── Warranty ─────────────────────────────────────────────────────────────

/** Counts of warranties expiring soon / already expired, across items and units. */
export async function getWarrantySummary(): Promise<WarrantySummary> {
  return apiGet<WarrantySummary>('/inventory/warranty/summary');
}

/**
 * GET /api/v1/inventory/warranty/records — the unified warranty search: serialized units and
 * non-serialized products in one list, always ordered soonest-expiry-first (no sort param).
 */
export async function searchWarrantyRecords(
  params: WarrantyRecordSearchParams = {},
): Promise<PageResponse<WarrantyRecord>> {
  const page = await apiGet<RawPage<WarrantyRecord>>('/inventory/warranty/records', params);
  return { items: page.content, meta: page.meta };
}

/** Suppliers actually present on products — fills the filter dropdown. */
export async function getWarrantySuppliers(): Promise<string[]> {
  return apiGet<string[]>('/inventory/warranty/suppliers');
}

// ── Warranty claims ─────────────────────────────────────────────────────

export async function getWarrantyClaims(
  params: WarrantyClaimListParams = {},
): Promise<PageResponse<WarrantyClaim>> {
  const page = await apiGet<RawPage<WarrantyClaim>>('/inventory/warranty/claims', params);
  return { items: page.content, meta: page.meta };
}

/** Every claim ever filed against one product or unit, newest first. */
export async function getWarrantyClaimsForTarget(
  targetType: WarrantyTargetType,
  targetId: string,
): Promise<WarrantyClaim[]> {
  return apiGet<WarrantyClaim[]>(`/inventory/warranty/targets/${targetType}/${targetId}/claims`);
}

/** Applies immediately — a claim records an external fact, it doesn't change stock. */
export async function createWarrantyClaim(body: WarrantyClaimRequest): Promise<WarrantyClaim> {
  return apiPost<WarrantyClaim>('/inventory/warranty/claims', body);
}

/** Records the supplier's answer: accepted (they pay) or rejected (we do). */
export async function decideWarrantyClaim(
  id: string,
  body: WarrantyClaimDecisionRequest,
): Promise<WarrantyClaim> {
  return apiPost<WarrantyClaim>(`/inventory/warranty/claims/${id}/decision`, body);
}

export async function deleteWarrantyClaim(id: string): Promise<void> {
  return apiDelete(`/inventory/warranty/claims/${id}`);
}

export async function getItemWarrantyExtensions(itemId: string): Promise<WarrantyExtension[]> {
  return apiGet<WarrantyExtension[]>(`/inventory/warranty/items/${itemId}/extensions`);
}

export async function getUnitWarrantyExtensions(unitId: string): Promise<WarrantyExtension[]> {
  return apiGet<WarrantyExtension[]>(`/inventory/warranty/units/${unitId}/extensions`);
}

/** Extending is reviewed like any other consequential change — this only queues the request. */
export async function extendItemWarranty(
  itemId: string,
  body: WarrantyExtendRequest,
): Promise<ApprovalRequest> {
  return apiPost<ApprovalRequest>(`/inventory/warranty/items/${itemId}/extend`, body);
}

export async function extendUnitWarranty(
  unitId: string,
  body: WarrantyExtendRequest,
): Promise<ApprovalRequest> {
  return apiPost<ApprovalRequest>(`/inventory/warranty/units/${unitId}/extend`, body);
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
