import { apiGet, apiPost } from './client';
import type { PageMeta, PageResponse } from '@/types/api';
import type { ApprovalListParams, ApprovalRequest } from '@/types/approval';

/** Təsdiqləmələr API surface (see lib/api/inventory.ts for the `{content, meta}` convention). */

interface RawPage<T> {
  content: T[];
  meta: PageMeta;
}

export async function getApprovals(
  params: ApprovalListParams = {},
): Promise<PageResponse<ApprovalRequest>> {
  const page = await apiGet<RawPage<ApprovalRequest>>('/approvals', params);
  return { items: page.content, meta: page.meta };
}

export async function getApproval(id: string): Promise<ApprovalRequest> {
  return apiGet<ApprovalRequest>(`/approvals/${id}`);
}

/** Sidebar badge counter. */
export async function getPendingApprovalCount(): Promise<number> {
  const result = await apiGet<{ count: number }>('/approvals/pending-count');
  return result.count;
}

export async function approveRequest(id: string, note?: string): Promise<ApprovalRequest> {
  return apiPost<ApprovalRequest>(`/approvals/${id}/approve`, { note });
}

export async function rejectRequest(id: string, note?: string): Promise<ApprovalRequest> {
  return apiPost<ApprovalRequest>(`/approvals/${id}/reject`, { note });
}

/** Withdrawing your own pending request — releases the lock without applying anything. */
export async function cancelRequest(id: string): Promise<ApprovalRequest> {
  return apiPost<ApprovalRequest>(`/approvals/${id}/cancel`, {});
}
