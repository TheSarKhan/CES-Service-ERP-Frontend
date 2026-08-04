'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from '@/lib/api/inventory';
import { useAuthStore } from '@/store/auth-store';
import type {
  InventoryCategoryFieldRequest,
  InventoryCategoryRequest,
  InventoryItemListParams,
  InventoryItemRequest,
  InventoryItemUnitBatchCreateRequest,
  InventoryItemUnitUpdateRequest,
  InventoryNodeRequest,
  InventoryUnitSearchParams,
  StockQuantityRequest,
  WarrantyClaimDecisionRequest,
  WarrantyClaimListParams,
  WarrantyClaimRequest,
  WarrantyExtendRequest,
  WarrantyRecordSearchParams,
  WarrantyTargetType,
} from '@/types/inventory';

export const inventoryKeys = {
  all: ['inventory'] as const,
  nodeChildren: (branchId: string | null, parentId: string | undefined) =>
    ['inventory', 'nodes', branchId, parentId ?? 'root'] as const,
  node: (id: string) => ['inventory', 'nodes', 'detail', id] as const,
  nodePath: (id: string) => ['inventory', 'nodes', 'path', id] as const,
  categories: (branchId: string | null) => ['inventory', 'categories', branchId] as const,
  category: (id: string) => ['inventory', 'categories', 'detail', id] as const,
  items: (branchId: string | null, params: InventoryItemListParams) =>
    ['inventory', 'items', branchId, params] as const,
  item: (id: string) => ['inventory', 'items', 'detail', id] as const,
  itemCategoryIds: (nodeId: string) => ['inventory', 'items', 'category-ids', nodeId] as const,
  itemUnits: (itemId: string) => ['inventory', 'items', itemId, 'units'] as const,
  itemUnit: (id: string) => ['inventory', 'item-units', 'detail', id] as const,
  unitSearch: (branchId: string | null, params: InventoryUnitSearchParams) =>
    ['inventory', 'item-units', branchId, params] as const,
  warrantySummary: (branchId: string | null) => ['inventory', 'warranty', 'summary', branchId] as const,
  warrantyExtensions: (target: 'items' | 'units', id: string) =>
    ['inventory', 'warranty', target, id, 'extensions'] as const,
  warrantyRecords: (branchId: string | null, params: WarrantyRecordSearchParams) =>
    ['inventory', 'warranty', 'records', branchId, params] as const,
  warrantySuppliers: (branchId: string | null) =>
    ['inventory', 'warranty', 'suppliers', branchId] as const,
  warrantyClaims: (branchId: string | null, params: WarrantyClaimListParams) =>
    ['inventory', 'warranty', 'claims', branchId, params] as const,
  warrantyTargetClaims: (targetType: string, targetId: string) =>
    ['inventory', 'warranty', 'claims', 'target', targetType, targetId] as const,
};

// ── Layer nodes ──────────────────────────────────────────────────────────

export function useInventoryNodeChildren(parentId?: string, enabled = true) {
  const activeBranchId = useAuthStore((s) => s.activeBranchId);
  return useQuery({
    queryKey: inventoryKeys.nodeChildren(activeBranchId, parentId),
    queryFn: () => api.getInventoryNodeChildren(parentId),
    enabled: enabled && Boolean(activeBranchId),
  });
}

export function useInventoryNode(id: string | null) {
  return useQuery({
    queryKey: inventoryKeys.node(id ?? ''),
    queryFn: () => api.getInventoryNode(id as string),
    enabled: Boolean(id),
  });
}

/** Root-first ancestor chain for a node — lets a caller reconstruct/jump to its breadcrumb. */
export function useInventoryNodePath(id: string | null, enabled = true) {
  return useQuery({
    queryKey: inventoryKeys.nodePath(id ?? ''),
    queryFn: () => api.getInventoryNodePath(id as string),
    enabled: enabled && Boolean(id),
  });
}

function useInvalidateNodes() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ['inventory', 'nodes'] });
}

export function useCreateInventoryNode() {
  const invalidate = useInvalidateNodes();
  return useMutation({
    mutationFn: (body: InventoryNodeRequest) => api.createInventoryNode(body),
    onSuccess: invalidate,
  });
}

export function useUpdateInventoryNode() {
  const invalidate = useInvalidateNodes();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: InventoryNodeRequest }) =>
      api.updateInventoryNode(id, body),
    onSuccess: invalidate,
  });
}

export function useDeleteInventoryNode() {
  const invalidate = useInvalidateNodes();
  return useMutation({
    mutationFn: (id: string) => api.deleteInventoryNode(id),
    onSuccess: invalidate,
  });
}

// ── Categories ───────────────────────────────────────────────────────────

export function useInventoryCategories() {
  const activeBranchId = useAuthStore((s) => s.activeBranchId);
  return useQuery({
    queryKey: inventoryKeys.categories(activeBranchId),
    queryFn: () => api.getInventoryCategories(),
    enabled: Boolean(activeBranchId),
    staleTime: 30_000,
  });
}

export function useInventoryCategory(id: string | null) {
  return useQuery({
    queryKey: inventoryKeys.category(id ?? ''),
    queryFn: () => api.getInventoryCategory(id as string),
    enabled: Boolean(id),
  });
}

function useInvalidateCategories() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ['inventory', 'categories'] });
}

export function useCreateInventoryCategory() {
  const invalidate = useInvalidateCategories();
  return useMutation({
    mutationFn: (body: InventoryCategoryRequest) => api.createInventoryCategory(body),
    onSuccess: invalidate,
  });
}

export function useUpdateInventoryCategory() {
  const invalidate = useInvalidateCategories();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: InventoryCategoryRequest }) =>
      api.updateInventoryCategory(id, body),
    onSuccess: invalidate,
  });
}

export function useDeleteInventoryCategory() {
  const invalidate = useInvalidateCategories();
  return useMutation({
    mutationFn: (id: string) => api.deleteInventoryCategory(id),
    onSuccess: invalidate,
  });
}

export function useAddInventoryCategoryField() {
  const invalidate = useInvalidateCategories();
  return useMutation({
    mutationFn: ({ categoryId, body }: { categoryId: string; body: InventoryCategoryFieldRequest }) =>
      api.addInventoryCategoryField(categoryId, body),
    onSuccess: invalidate,
  });
}

export function useUpdateInventoryCategoryField() {
  const invalidate = useInvalidateCategories();
  return useMutation({
    mutationFn: ({
      categoryId,
      fieldId,
      body,
    }: {
      categoryId: string;
      fieldId: string;
      body: InventoryCategoryFieldRequest;
    }) => api.updateInventoryCategoryField(categoryId, fieldId, body),
    onSuccess: invalidate,
  });
}

export function useRemoveInventoryCategoryField() {
  const invalidate = useInvalidateCategories();
  return useMutation({
    mutationFn: ({ categoryId, fieldId }: { categoryId: string; fieldId: string }) =>
      api.removeInventoryCategoryField(categoryId, fieldId),
    onSuccess: invalidate,
  });
}

export function useReorderInventoryCategoryFields() {
  const invalidate = useInvalidateCategories();
  return useMutation({
    mutationFn: ({ categoryId, fieldIds }: { categoryId: string; fieldIds: string[] }) =>
      api.reorderInventoryCategoryFields(categoryId, fieldIds),
    onSuccess: invalidate,
  });
}

export function useUploadInventoryImage() {
  return useMutation({
    mutationFn: (file: File) => api.uploadInventoryImage(file),
  });
}

// ── Items ────────────────────────────────────────────────────────────────

export function useInventoryItems(params: InventoryItemListParams = {}, enabled = true) {
  const activeBranchId = useAuthStore((s) => s.activeBranchId);
  return useQuery({
    queryKey: inventoryKeys.items(activeBranchId, params),
    queryFn: () => api.getInventoryItems(params),
    enabled: enabled && Boolean(activeBranchId),
    staleTime: 15_000,
  });
}

export function useInventoryItem(id: string | null) {
  return useQuery({
    queryKey: inventoryKeys.item(id ?? ''),
    queryFn: () => api.getInventoryItem(id as string),
    enabled: Boolean(id),
  });
}

/** Distinct category ids present at a node — see api.getInventoryItemCategoryIds javadoc. */
export function useInventoryItemCategoryIds(nodeId: string | null, enabled = true) {
  return useQuery({
    queryKey: inventoryKeys.itemCategoryIds(nodeId ?? ''),
    queryFn: () => api.getInventoryItemCategoryIds(nodeId as string),
    enabled: enabled && Boolean(nodeId),
  });
}

function useInvalidateItems() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ['inventory', 'items'] });
}

export function useCreateInventoryItem() {
  const invalidate = useInvalidateItems();
  return useMutation({
    mutationFn: (body: InventoryItemRequest) => api.createInventoryItem(body),
    onSuccess: invalidate,
  });
}

export function useUpdateInventoryItem() {
  const invalidate = useInvalidateItems();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: InventoryItemRequest }) =>
      api.updateInventoryItem(id, body),
    onSuccess: invalidate,
  });
}

export function useDeleteInventoryItem() {
  const invalidate = useInvalidateItems();
  return useMutation({
    mutationFn: (id: string) => api.deleteInventoryItem(id),
    onSuccess: invalidate,
  });
}

export function useMoveInventoryItem() {
  const invalidate = useInvalidateItems();
  return useMutation({
    mutationFn: ({ id, fromNodeId, toNodeId }: { id: string; fromNodeId: string; toNodeId: string }) =>
      api.moveInventoryItem(id, fromNodeId, toNodeId),
    onSuccess: invalidate,
  });
}

export function useStockOperation(kind: 'in' | 'out' | 'adjust') {
  const invalidate = useInvalidateItems();
  const fn = kind === 'in' ? api.stockInInventoryItem : kind === 'out' ? api.stockOutInventoryItem : api.adjustInventoryItem;
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: StockQuantityRequest }) => fn(id, body),
    onSuccess: invalidate,
  });
}

// ── Serialized units / warranty ─────────────────────────────────────────

export function useInventoryItemUnits(itemId: string | null) {
  return useQuery({
    queryKey: inventoryKeys.itemUnits(itemId ?? ''),
    queryFn: () => api.getInventoryItemUnits(itemId as string),
    enabled: Boolean(itemId),
  });
}

export function useInventoryItemUnit(id: string | null) {
  return useQuery({
    queryKey: inventoryKeys.itemUnit(id ?? ''),
    queryFn: () => api.getInventoryItemUnit(id as string),
    enabled: Boolean(id),
  });
}

export function useCreateInventoryItemUnitBatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, body }: { itemId: string; body: InventoryItemUnitBatchCreateRequest }) =>
      api.createInventoryItemUnitBatch(itemId, body),
    onSuccess: (_units, variables) => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.itemUnits(variables.itemId) });
      queryClient.invalidateQueries({ queryKey: ['inventory', 'item-units'] });
    },
  });
}

export function useInventoryUnitSearch(params: InventoryUnitSearchParams = {}) {
  const activeBranchId = useAuthStore((s) => s.activeBranchId);
  return useQuery({
    queryKey: inventoryKeys.unitSearch(activeBranchId, params),
    queryFn: () => api.searchInventoryItemUnits(params),
    enabled: Boolean(activeBranchId),
    staleTime: 15_000,
  });
}

function useInvalidateUnits() {
  const queryClient = useQueryClient();
  return () => {
    // Both the global warranty-search key (['inventory','item-units']) and the per-item list
    // key (['inventory','items',itemId,'units']) must refresh — invalidate the shared root
    // rather than keep two prefixes in sync by hand.
    queryClient.invalidateQueries({ queryKey: inventoryKeys.all });
  };
}

export function useUpdateInventoryItemUnit() {
  const invalidate = useInvalidateUnits();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: InventoryItemUnitUpdateRequest }) =>
      api.updateInventoryItemUnit(id, body),
    onSuccess: invalidate,
  });
}

export function useMarkInventoryItemUnitFailed() {
  const invalidate = useInvalidateUnits();
  return useMutation({
    mutationFn: ({ id, failureNotes }: { id: string; failureNotes?: string }) =>
      api.markInventoryItemUnitFailed(id, failureNotes),
    onSuccess: invalidate,
  });
}

// ── Warranty ─────────────────────────────────────────────────────────────

export function useWarrantySummary() {
  const activeBranchId = useAuthStore((s) => s.activeBranchId);
  return useQuery({
    queryKey: inventoryKeys.warrantySummary(activeBranchId),
    queryFn: () => api.getWarrantySummary(),
    enabled: Boolean(activeBranchId),
    staleTime: 60_000,
  });
}

/** The unified warranty search — units and whole products in one paged list. */
export function useWarrantyRecords(params: WarrantyRecordSearchParams = {}) {
  const activeBranchId = useAuthStore((s) => s.activeBranchId);
  return useQuery({
    queryKey: inventoryKeys.warrantyRecords(activeBranchId, params),
    queryFn: () => api.searchWarrantyRecords(params),
    enabled: Boolean(activeBranchId),
    staleTime: 15_000,
  });
}

export function useWarrantySuppliers() {
  const activeBranchId = useAuthStore((s) => s.activeBranchId);
  return useQuery({
    queryKey: inventoryKeys.warrantySuppliers(activeBranchId),
    queryFn: () => api.getWarrantySuppliers(),
    enabled: Boolean(activeBranchId),
    staleTime: 5 * 60_000,
  });
}

// ── Warranty claims ──────────────────────────────────────────────────────

export function useWarrantyClaims(params: WarrantyClaimListParams = {}) {
  const activeBranchId = useAuthStore((s) => s.activeBranchId);
  return useQuery({
    queryKey: inventoryKeys.warrantyClaims(activeBranchId, params),
    queryFn: () => api.getWarrantyClaims(params),
    enabled: Boolean(activeBranchId),
  });
}

export function useWarrantyTargetClaims(
  targetType: WarrantyTargetType | null,
  targetId: string | null,
) {
  return useQuery({
    queryKey: inventoryKeys.warrantyTargetClaims(targetType ?? '', targetId ?? ''),
    queryFn: () => api.getWarrantyClaimsForTarget(targetType as WarrantyTargetType, targetId as string),
    enabled: Boolean(targetType && targetId),
  });
}

/**
 * Claims are not queued for approval — they document something that already happened with the
 * supplier, so both mutations apply straight away and just refresh what's on screen.
 */
function useInvalidateClaims() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ['inventory', 'warranty'] });
  };
}

export function useCreateWarrantyClaim() {
  const invalidate = useInvalidateClaims();
  return useMutation({
    mutationFn: (body: WarrantyClaimRequest) => api.createWarrantyClaim(body),
    onSuccess: invalidate,
  });
}

export function useDecideWarrantyClaim() {
  const invalidate = useInvalidateClaims();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: WarrantyClaimDecisionRequest }) =>
      api.decideWarrantyClaim(id, body),
    onSuccess: invalidate,
  });
}

export function useDeleteWarrantyClaim() {
  const invalidate = useInvalidateClaims();
  return useMutation({
    mutationFn: (id: string) => api.deleteWarrantyClaim(id),
    onSuccess: invalidate,
  });
}

export function useItemWarrantyExtensions(itemId: string | null, enabled = true) {
  return useQuery({
    queryKey: inventoryKeys.warrantyExtensions('items', itemId ?? ''),
    queryFn: () => api.getItemWarrantyExtensions(itemId as string),
    enabled: enabled && Boolean(itemId),
  });
}

export function useUnitWarrantyExtensions(unitId: string | null, enabled = true) {
  return useQuery({
    queryKey: inventoryKeys.warrantyExtensions('units', unitId ?? ''),
    queryFn: () => api.getUnitWarrantyExtensions(unitId as string),
    enabled: enabled && Boolean(unitId),
  });
}

/** Queues an extension for approval — nothing moves until a second person approves it. */
export function useExtendWarranty(target: 'item' | 'unit') {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: WarrantyExtendRequest }) =>
      target === 'item' ? api.extendItemWarranty(id, body) : api.extendUnitWarranty(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.all });
      queryClient.invalidateQueries({ queryKey: ['approvals'] });
    },
  });
}

// ── QR / barcode lookup ──────────────────────────────────────────────────

export function useInventoryLookup() {
  return useMutation({
    mutationFn: (code: string) => api.lookupInventoryCode(code),
  });
}
