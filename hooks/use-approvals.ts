'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from '@/lib/api/approvals';
import { useAuthStore } from '@/store/auth-store';
import type { ApprovalListParams } from '@/types/approval';

export const approvalKeys = {
  all: ['approvals'] as const,
  list: (branchId: string | null, params: ApprovalListParams) =>
    ['approvals', 'list', branchId, params] as const,
  detail: (id: string) => ['approvals', 'detail', id] as const,
  pendingCount: (branchId: string | null) => ['approvals', 'pending-count', branchId] as const,
};

export function useApprovals(params: ApprovalListParams = {}) {
  const activeBranchId = useAuthStore((s) => s.activeBranchId);
  return useQuery({
    queryKey: approvalKeys.list(activeBranchId, params),
    queryFn: () => api.getApprovals(params),
    enabled: Boolean(activeBranchId),
  });
}

export function usePendingApprovalCount() {
  const activeBranchId = useAuthStore((s) => s.activeBranchId);
  const hasPermission = useAuthStore((s) => s.hasPermission);
  return useQuery({
    queryKey: approvalKeys.pendingCount(activeBranchId),
    queryFn: () => api.getPendingApprovalCount(),
    enabled: Boolean(activeBranchId) && hasPermission('APPROVAL_READ'),
    staleTime: 30_000,
  });
}

/**
 * Deciding a request mutates the underlying warehouse record too, so both trees are invalidated —
 * an approved edit must show up in the item list immediately, not on the next manual refresh.
 */
function useInvalidateAfterDecision() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: approvalKeys.all });
    queryClient.invalidateQueries({ queryKey: ['inventory'] });
  };
}

export function useApproveRequest() {
  const invalidate = useInvalidateAfterDecision();
  return useMutation({
    mutationFn: ({ id, note }: { id: string; note?: string }) => api.approveRequest(id, note),
    onSuccess: invalidate,
  });
}

export function useRejectRequest() {
  const invalidate = useInvalidateAfterDecision();
  return useMutation({
    mutationFn: ({ id, note }: { id: string; note?: string }) => api.rejectRequest(id, note),
    onSuccess: invalidate,
  });
}

export function useCancelRequest() {
  const invalidate = useInvalidateAfterDecision();
  return useMutation({
    mutationFn: (id: string) => api.cancelRequest(id),
    onSuccess: invalidate,
  });
}
