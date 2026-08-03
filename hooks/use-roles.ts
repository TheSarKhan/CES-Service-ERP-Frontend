'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  assignPermissions,
  createRole,
  deleteRole,
  getPermissions,
  getRolePermissions,
  getRoles,
  getRoleUsers,
  updateRole,
} from '@/lib/api/roles';
import { useAuthStore } from '@/store/auth-store';
import type {
  AssignPermissionsRequest,
  CreateRoleRequest,
  RoleListParams,
  UpdateRoleRequest,
} from '@/types/role';

/** Query key factory for role & permission queries. */
export const roleKeys = {
  all: ['roles'] as const,
  list: (branchId: string | null, params: RoleListParams) =>
    [...roleKeys.all, 'list', branchId, params] as const,
  permissions: (roleId: string) => [...roleKeys.all, roleId, 'permissions'] as const,
  users: (roleId: string) => [...roleKeys.all, roleId, 'users'] as const,
};

export const permissionKeys = {
  catalog: ['permissions', 'catalog'] as const,
};

/** Paginated role list (branch-scoped). */
export function useRoles(params: RoleListParams = {}) {
  const activeBranchId = useAuthStore((s) => s.activeBranchId);

  return useQuery({
    queryKey: roleKeys.list(activeBranchId, params),
    queryFn: () => getRoles(params),
    enabled: Boolean(activeBranchId),
    staleTime: 30_000,
  });
}

/** Permissions currently granted to a role — powers the expand row's left panel. */
export function useRolePermissions(roleId: string | null) {
  return useQuery({
    queryKey: roleKeys.permissions(roleId ?? ''),
    queryFn: () => getRolePermissions(roleId as string),
    enabled: Boolean(roleId),
  });
}

/** Users currently holding a role — powers the expand row's right panel. */
export function useRoleUsers(roleId: string | null) {
  return useQuery({
    queryKey: roleKeys.users(roleId ?? ''),
    queryFn: () => getRoleUsers(roleId as string),
    enabled: Boolean(roleId),
  });
}

/** Full permission catalog — powers the permission matrix (rarely changes). */
export function usePermissionCatalog() {
  return useQuery({
    queryKey: permissionKeys.catalog,
    queryFn: () => getPermissions(),
    staleTime: 5 * 60_000,
  });
}

/** Step 1 of role creation — creates the bare role (no permissions yet). */
export function useCreateRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateRoleRequest) => createRole(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: roleKeys.all });
    },
  });
}

/** Rename / re-code / (de)activate a role. Rejected by the API for system roles. */
export function useUpdateRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateRoleRequest }) => updateRole(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: roleKeys.all });
    },
  });
}

/** Soft-delete a role. Blocked by the API for system roles and roles still assigned to users. */
export function useDeleteRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteRole(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: roleKeys.all });
    },
  });
}

/** Step 2 of role creation (also reused for later permission edits). */
export function useAssignPermissions() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ roleId, body }: { roleId: string; body: AssignPermissionsRequest }) =>
      assignPermissions(roleId, body),
    onSuccess: (_role, variables) => {
      queryClient.invalidateQueries({ queryKey: roleKeys.all });
      queryClient.invalidateQueries({ queryKey: roleKeys.permissions(variables.roleId) });
    },
  });
}
