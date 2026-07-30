/**
 * RBAC (M16) domain types — matched to RoleResponse / PermissionResponse /
 * UserResponse on the backend (plain camelCase JSON, no snake_case mapping).
 */

export type PermissionType = 'CRUD' | 'BUSINESS' | 'REPORT' | 'SYSTEM';
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

/** A single permission catalog entry (GET /permissions). */
export interface Permission {
  id: string;
  code: string;
  name: string;
  description: string | null;
  module: string;
  permType: PermissionType;
  httpMethod: HttpMethod | null;
  isActive: boolean;
}

/** A role, optionally including its granted permissions. */
export interface Role {
  id: string;
  branchId: string;
  name: string;
  code: string;
  description: string | null;
  isSystem: boolean;
  isActive: boolean;
  permissions?: Permission[] | null;
  createdAt: string;
  updatedAt: string;
}

/** A user summary as returned by GET /roles/{id}/users. */
export interface RoleUser {
  id: string;
  branchId: string;
  fullName: string;
  email: string;
  phone: string | null;
  position: string | null;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

/** POST /api/v1/roles request body. */
export interface CreateRoleRequest {
  name: string;
  code: string;
  description?: string | null;
  isActive?: boolean;
  permissionIds?: string[];
}

/** POST /api/v1/roles/{id}/permissions request body. */
export interface AssignPermissionsRequest {
  permissionIds: string[];
}

/** GET /api/v1/roles query parameters. */
export interface RoleListParams {
  page?: number;
  size?: number;
  sort?: string;
  dir?: 'asc' | 'desc';
}
