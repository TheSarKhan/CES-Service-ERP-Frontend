'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from '@/lib/api/users';
import { useAuthStore } from '@/store/auth-store';
import type {
  ChangeOwnPasswordRequest,
  OwnProfileRequest,
  UserListParams,
  UserRequest,
} from '@/types/user';

export const userKeys = {
  all: ['users'] as const,
  list: (branchId: string | null, params: UserListParams) =>
    ['users', 'list', branchId, params] as const,
  detail: (id: string) => ['users', 'detail', id] as const,
  me: ['users', 'me'] as const,
};

export function useUsers(params: UserListParams = {}) {
  const activeBranchId = useAuthStore((s) => s.activeBranchId);
  return useQuery({
    queryKey: userKeys.list(activeBranchId, params),
    queryFn: () => api.getUsers(params),
    enabled: Boolean(activeBranchId),
  });
}

export function useUser(id: string | null) {
  return useQuery({
    queryKey: userKeys.detail(id ?? ''),
    queryFn: () => api.getUser(id as string),
    enabled: Boolean(id),
  });
}

function useInvalidateUsers() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: userKeys.all });
}

export function useCreateUser() {
  const invalidate = useInvalidateUsers();
  return useMutation({
    mutationFn: (body: UserRequest) => api.createUser(body),
    onSuccess: invalidate,
  });
}

export function useUpdateUser() {
  const invalidate = useInvalidateUsers();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UserRequest }) => api.updateUser(id, body),
    onSuccess: invalidate,
  });
}

/** Activate / deactivate share a hook because callers only ever flip the current state. */
export function useSetUserActive() {
  const invalidate = useInvalidateUsers();
  return useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      active ? api.activateUser(id) : api.deactivateUser(id),
    onSuccess: invalidate,
  });
}

export function useDeleteUser() {
  const invalidate = useInvalidateUsers();
  return useMutation({
    mutationFn: (id: string) => api.deleteUser(id),
    onSuccess: invalidate,
  });
}

export function useResetUserPassword() {
  const invalidate = useInvalidateUsers();
  return useMutation({
    mutationFn: (id: string) => api.resetUserPassword(id),
    onSuccess: invalidate,
  });
}

/**
 * Applies a whole role selection. Like role permissions, the API only grants or revokes one at a
 * time, so this diffs against what the user already holds and issues both halves.
 */
export function useSyncUserRoles() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      userId,
      branchId,
      selectedRoleIds,
      currentRoleIds,
    }: {
      userId: string;
      branchId: string;
      selectedRoleIds: string[];
      currentRoleIds: string[];
    }) => {
      const selected = new Set(selectedRoleIds);
      const current = new Set(currentRoleIds);
      for (const roleId of currentRoleIds.filter((id) => !selected.has(id))) {
        await api.revokeUserRole(userId, roleId, branchId);
      }
      for (const roleId of selectedRoleIds.filter((id) => !current.has(id))) {
        await api.assignUserRole(userId, { roleId, branchId });
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: userKeys.all }),
  });
}

// ── self-service ─────────────────────────────────────────────────────────

export function useOwnProfile() {
  const isAuthenticated = useAuthStore((s) => Boolean(s.accessToken));
  return useQuery({
    queryKey: userKeys.me,
    queryFn: () => api.getOwnProfile(),
    enabled: isAuthenticated,
  });
}

export function useUpdateOwnProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: OwnProfileRequest) => api.updateOwnProfile(body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: userKeys.all }),
  });
}

export function useChangeOwnPassword() {
  return useMutation({
    mutationFn: (body: ChangeOwnPasswordRequest) => api.changeOwnPassword(body),
  });
}
