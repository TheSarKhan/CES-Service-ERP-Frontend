/**
 * User administration (M15) domain types — matched to the backend user module DTOs.
 *
 * Note the naming split: `types/auth.ts` describes the *signed-in* user as the login endpoint
 * returns it (snake_case, permission list). These are the *administered* user records.
 */

/** A user row as returned by GET /api/v1/users. */
export interface ManagedUser {
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

export interface UserBranchMembership {
  branchId: string;
  isDefault: boolean;
}

export interface UserRoleAssignment {
  roleId: string;
  roleName: string;
  roleCode: string;
  branchId: string;
}

/** GET /api/v1/users/{id} — adds memberships, roles and lockout state. */
export interface ManagedUserDetail extends ManagedUser {
  failedAttempts: number;
  lockedUntil: string | null;
  updatedAt: string;
  branches: UserBranchMembership[];
  roles: UserRoleAssignment[];
}

/**
 * Create / update payload. `password` is optional on create — left out, the server generates a
 * temporary one and returns it — and ignored on update.
 */
export interface UserRequest {
  fullName: string;
  email: string;
  password?: string;
  phone?: string | null;
  position?: string | null;
  branchId: string;
  isActive?: boolean;
  roleIds?: { roleId: string; branchId: string }[];
}

/**
 * Result of creating a user or resetting a password. `temporaryPassword` is present only when the
 * server generated it, and only in this one response — afterwards only the hash exists.
 */
export interface CreatedUser {
  user: ManagedUser;
  temporary_password: string | null;
}

export interface OwnProfileRequest {
  fullName: string;
  phone?: string | null;
  position?: string | null;
}

export interface ChangeOwnPasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface UserListParams {
  isActive?: boolean;
  page?: number;
  size?: number;
  sort?: string;
  dir?: 'asc' | 'desc';
}
