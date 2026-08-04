/**
 * Təsdiqləmələr (approval queue) domain types — mirrors the backend approval module DTOs.
 *
 * Destructive warehouse actions don't apply on request: they're parked here and replayed once a
 * second person approves. `payload` is the change waiting to be applied, `beforeSnapshot` is the
 * record as it stood when the request was made — the two together form the diff a reviewer sees.
 */

export type ApprovalEntityType =
  | 'INVENTORY_ITEM'
  | 'INVENTORY_ITEM_UNIT'
  | 'INVENTORY_NODE'
  | 'INVENTORY_CATEGORY'
  | 'INVENTORY_STOCKTAKE';

export type ApprovalOperation =
  | 'UPDATE'
  | 'DELETE'
  | 'MOVE'
  | 'STOCK_IN'
  | 'STOCK_OUT'
  | 'STOCK_ADJUST'
  | 'FIELD_ADD'
  | 'FIELD_UPDATE'
  | 'FIELD_DELETE'
  | 'WARRANTY_EXTEND'
  | 'STOCKTAKE_APPLY';

export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

export interface ApprovalRequest {
  id: string;
  entityType: ApprovalEntityType;
  entityId: string;
  entityLabel: string | null;
  operation: ApprovalOperation;
  status: ApprovalStatus;
  payload: Record<string, unknown> | null;
  beforeSnapshot: Record<string, unknown> | null;
  requestedBy: string | null;
  requestedByName: string | null;
  requestedAt: string;
  decidedBy: string | null;
  decidedByName: string | null;
  decidedAt: string | null;
  decisionNote: string | null;
}

export interface ApprovalListParams {
  status?: ApprovalStatus;
  page?: number;
  size?: number;
}
