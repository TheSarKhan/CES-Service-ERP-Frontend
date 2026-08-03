import { apiDelete, apiGet, apiPost, apiPut } from './client';
import type { PageMeta, PageResponse } from '@/types/api';
import type {
  AssignPermissionsRequest,
  CreateRoleRequest,
  Permission,
  Role,
  RoleListParams,
  RoleUser,
  UpdateRoleRequest,
} from '@/types/role';

/**
 * Role & permission (M16 RBAC) API surface.
 *
 * Note: unlike `apiList` (shared client helper), the backend's list envelope
 * nests `{ content, meta }` under `data` (see `PageResponse` on the backend) —
 * so list endpoints here unwrap via a plain `apiGet` instead.
 */

interface RawPage<T> {
  content: T[];
  meta: PageMeta;
}

/** GET /api/v1/roles — paginated list. */
export async function getRoles(
  params: RoleListParams = {},
): Promise<PageResponse<Role>> {
  const page = await apiGet<RawPage<Role>>('/roles', params);
  return { items: page.content, meta: page.meta };
}

/** POST /api/v1/roles */
export async function createRole(body: CreateRoleRequest): Promise<Role> {
  return apiPost<Role>('/roles', body);
}

/** PUT /api/v1/roles/{id} — rename / re-code / (de)activate. System roles are rejected. */
export async function updateRole(id: string, body: UpdateRoleRequest): Promise<Role> {
  return apiPut<Role>(`/roles/${id}`, body);
}

/** DELETE /api/v1/roles/{id} — soft delete. Blocked for system roles and roles still in use. */
export async function deleteRole(id: string): Promise<void> {
  return apiDelete(`/roles/${id}`);
}

/** GET /api/v1/roles/{id}/permissions — permissions currently granted to a role. */
export async function getRolePermissions(id: string): Promise<Permission[]> {
  return apiGet<Permission[]>(`/roles/${id}/permissions`);
}

/** POST /api/v1/roles/{id}/permissions — grant permissions to a role. */
export async function assignPermissions(
  id: string,
  body: AssignPermissionsRequest,
): Promise<Role> {
  return apiPost<Role>(`/roles/${id}/permissions`, body);
}

/** GET /api/v1/roles/{id}/users — users currently holding a role. */
export async function getRoleUsers(id: string): Promise<RoleUser[]> {
  return apiGet<RoleUser[]>(`/roles/${id}/users`);
}

/** GET /api/v1/permissions — full permission catalog (optionally filtered by module). */
export async function getPermissions(module?: string): Promise<Permission[]> {
  return apiGet<Permission[]>('/permissions', module ? { module } : undefined);
}
