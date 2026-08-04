/**
 * Inventory (Stok İdarəetməsi) domain types — matched to the backend's inventory module DTOs
 * (plain camelCase JSON, same convention as the RBAC module).
 */

export type InventoryFieldType = 'TEXT' | 'TEXTAREA' | 'NUMBER' | 'DATE' | 'IMAGE' | 'MULTI_IMAGE';

export type InventoryUnitStatus = 'IN_STOCK' | 'IN_USE' | 'FAILED' | 'DISPOSED' | 'RETURNED';

export type WarrantyStatus = 'NONE' | 'ACTIVE' | 'EXPIRING_SOON' | 'EXPIRED';

/** A single node in the dynamic physical storage tree (Layer). */
export interface InventoryNode {
  id: string;
  branchId: string;
  parentId: string | null;
  name: string;
  code: string | null;
  qrCode: string | null;
  barcode: string | null;
  isActive: boolean;
  notes: string | null;
  hasChildren: boolean;
  /** Categories allowed at this node; empty = unrestricted (any category may be used here). */
  categoryIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface InventoryNodeRequest {
  name: string;
  code?: string | null;
  parentId?: string | null;
  notes?: string | null;
  isActive?: boolean;
  /** Omit to leave unchanged; empty array clears the restriction; non-empty replaces it. */
  categoryIds?: string[];
}

/** A single dynamic category field definition. */
export interface InventoryCategoryField {
  id: string;
  categoryId: string;
  fieldKey: string;
  label: string;
  fieldType: InventoryFieldType;
  isRequired: boolean;
  defaultValue: string | null;
  placeholder: string | null;
  validationRegex: string | null;
  sortOrder: number;
  isVisible: boolean;
  /** Whether this field gets its own column in the leaf-node item table. */
  showInTable: boolean;
  /** Auto-seeded on category creation (Şəkil/Açıqlama/İstehsalçı/Vəziyyət) — cannot be deleted. */
  isSystem: boolean;
}

export interface InventoryCategoryFieldRequest {
  fieldKey: string;
  label: string;
  fieldType: InventoryFieldType;
  isRequired?: boolean;
  defaultValue?: string | null;
  placeholder?: string | null;
  validationRegex?: string | null;
  sortOrder?: number;
  isVisible?: boolean;
  showInTable?: boolean;
}

/** A product category (Elektronika / Mebel / Kimyəvi maddələr ...). */
export interface InventoryCategory {
  id: string;
  branchId: string;
  name: string;
  defaultUnit: string;
  isActive: boolean;
  fields: InventoryCategoryField[] | null;
  createdAt: string;
  updatedAt: string;
}

export interface InventoryCategoryRequest {
  name: string;
  defaultUnit: string;
  isActive?: boolean;
  fields?: InventoryCategoryFieldRequest[];
}

/** A product. */
export interface InventoryItem {
  id: string;
  branchId: string;
  nodeId: string;
  categoryId: string;
  name: string;
  sku: string;
  barcode: string | null;
  qrCode: string | null;
  unit: string;
  quantity: number;
  purchasePrice: number;
  isSerialized: boolean;
  attributes: Record<string, unknown>;
  /** Warranty length in months. On a serialized item this is the default for its new units. */
  warrantyMonths: number | null;
  warrantyStartDate: string | null;
  /** Only set for non-serialized items — a serialized item's warranty lives on each unit. */
  warrantyEndDate: string | null;
  /** Derived server-side; always NONE for serialized items, whose units carry the real dates. */
  warrantyStatus: WarrantyStatus;
  /** Who a warranty claim on this product goes to. */
  supplier: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface InventoryItemRequest {
  nodeId: string;
  categoryId: string;
  name: string;
  sku: string;
  barcode: string;
  unit: string;
  quantity: number;
  purchasePrice: number;
  isSerialized?: boolean;
  attributes?: Record<string, unknown>;
  warrantyMonths?: number | null;
  warrantyStartDate?: string | null;
  warrantyEndDate?: string | null;
  supplier?: string | null;
  notes?: string | null;
  isActive?: boolean;
}

export interface StockQuantityRequest {
  quantity: number;
  reason?: string;
}

/** A single serialized, warranty-tracked physical unit of an item. */
export interface InventoryItemUnit {
  id: string;
  branchId: string;
  itemId: string;
  itemName: string | null;
  itemSku: string | null;
  nodeId: string;
  serialNumber: string;
  qrCode: string | null;
  barcode: string | null;
  status: InventoryUnitStatus;
  purchaseDate: string;
  warrantyStartDate: string | null;
  warrantyEndDate: string | null;
  warrantyStatus: WarrantyStatus;
  failedAt: string | null;
  failureNotes: string | null;
  usedInWorkOrderId: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface InventoryItemUnitBatchCreateRequest {
  serialNumbers: string[];
  nodeId?: string | null;
  purchaseDate?: string | null;
  warrantyStartDate?: string | null;
  warrantyEndDate?: string | null;
  notes?: string | null;
}

export interface InventoryItemUnitUpdateRequest {
  status?: InventoryUnitStatus;
  nodeId?: string;
  warrantyStartDate?: string | null;
  warrantyEndDate?: string | null;
  notes?: string | null;
}

export interface InventoryLookupResult {
  type: 'NODE' | 'ITEM' | 'ITEM_UNIT';
  id: string;
}

export interface InventoryItemListParams {
  categoryId?: string;
  nodeId?: string;
  search?: string;
  page?: number;
  size?: number;
  sort?: string;
  dir?: 'asc' | 'desc';
}

export interface InventoryUnitSearchParams {
  itemId?: string;
  status?: InventoryUnitStatus;
  search?: string;
  page?: number;
  size?: number;
  sort?: string;
  dir?: 'asc' | 'desc';
}

/** Target of a warranty extension — a whole product, or one serialized unit of it. */
export type WarrantyTargetType = 'INVENTORY_ITEM' | 'INVENTORY_ITEM_UNIT';

/**
 * "Zəmanəti uzat" payload. Give either `months` to add to the current end date, or an absolute
 * `newEndDate` — the API rejects a request that gives neither.
 */
export interface WarrantyExtendRequest {
  months?: number;
  newEndDate?: string;
  reason?: string;
}

/** One applied extension. Written only after approval, so every row actually took effect. */
export interface WarrantyExtension {
  id: string;
  targetType: WarrantyTargetType;
  targetId: string;
  targetLabel: string | null;
  previousEndDate: string | null;
  newEndDate: string;
  monthsAdded: number | null;
  reason: string | null;
  createdBy: string | null;
  createdAt: string;
}

/** Counts behind the expiry badge and dashboard card. */
export interface WarrantySummary {
  expiringSoonItems: number;
  expiringSoonUnits: number;
  expiredItems: number;
  expiredUnits: number;
  expiringSoonTotal: number;
  expiredTotal: number;
  /** Claims sent to a supplier with no answer yet. */
  openClaims: number;
}

// ── Unified warranty search ──────────────────────────────────────────────

/** Whether a warranty search row is a whole product or one serialized unit. */
export type WarrantyRecordType = 'ITEM' | 'UNIT';

/**
 * One warranty search result. Products (bought as a batch under one warranty) and serialized
 * units come back in the same shape, so the list can show both — `recordType` says which.
 */
export interface WarrantyRecord {
  /** Unit id on a UNIT row, item id on an ITEM row. */
  recordId: string;
  recordType: WarrantyRecordType;
  itemId: string;
  itemName: string;
  itemSku: string;
  /** Null on ITEM rows. */
  serialNumber: string | null;
  /** Null on ITEM rows — only units have a lifecycle status. */
  unitStatus: InventoryUnitStatus | null;
  nodeId: string;
  barcode: string | null;
  qrCode: string | null;
  warrantyStartDate: string | null;
  warrantyEndDate: string | null;
  warrantyStatus: WarrantyStatus;
  /** Negative once expired; null when there is no end date. */
  daysRemaining: number | null;
  supplier: string | null;
  /** Stock on hand; null on UNIT rows. */
  quantity: number | null;
  unit: string;
  /** Most recent claim, or null when nobody has chased this yet. */
  latestClaim: WarrantyClaim | null;
}

export interface WarrantyRecordSearchParams {
  search?: string;
  recordType?: WarrantyRecordType;
  warrantyStatus?: WarrantyStatus;
  unitStatus?: InventoryUnitStatus;
  supplier?: string;
  endFrom?: string;
  endTo?: string;
  /** Shorthand for "expiring within N days"; ignored when endFrom/endTo are given. */
  withinDays?: number;
  page?: number;
  size?: number;
}

// ── Warranty claims ──────────────────────────────────────────────────────

/**
 * ACCEPTED means the supplier covers the cost; REJECTED means we do. That distinction is the
 * whole reason claims are tracked.
 */
export type WarrantyClaimStatus = 'SUBMITTED' | 'ACCEPTED' | 'REJECTED' | 'RESOLVED';

export type WarrantyClaimResolution = 'REPLACED' | 'REPAIRED' | 'REFUNDED' | 'NONE';

export interface WarrantyClaim {
  id: string;
  targetType: WarrantyTargetType;
  targetId: string;
  targetLabel: string | null;
  itemId: string | null;
  supplier: string | null;
  claimNumber: string | null;
  status: WarrantyClaimStatus;
  resolution: WarrantyClaimResolution | null;
  description: string | null;
  decisionNotes: string | null;
  submittedAt: string;
  decidedAt: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WarrantyClaimRequest {
  targetType: WarrantyTargetType;
  targetId: string;
  supplier?: string | null;
  claimNumber?: string | null;
  description?: string | null;
  submittedAt?: string | null;
}

export interface WarrantyClaimDecisionRequest {
  status: WarrantyClaimStatus;
  resolution?: WarrantyClaimResolution | null;
  decisionNotes?: string | null;
  decidedAt?: string | null;
}

export interface WarrantyClaimListParams {
  status?: WarrantyClaimStatus;
  search?: string;
  page?: number;
  size?: number;
}
