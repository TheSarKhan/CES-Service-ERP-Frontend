/**
 * Auth domain types — matched exactly to the SRS §4.2 login response shape.
 */

/** A branch the user is allowed to operate within. */
export interface Branch {
  id: string;
  name: string;
  code?: string;
}

/** Role code (e.g. "SERVICE_MANAGER"). */
export type Role = string;

/** Permission code (e.g. "WO_CREATE"). */
export type Permission = string;

/**
 * Authenticated user profile, as embedded in the login response.
 * Field names mirror the backend JSON (snake_case) exactly.
 */
export interface User {
  id: string;
  full_name: string;
  email: string;
  branch_id: string;
  branches: Branch[];
  roles: Role[];
  permissions: Permission[];
  /** True while the account still holds an admin-issued temporary password. */
  must_change_password?: boolean;
}

/** POST /api/v1/auth/login request body (SRS §4.2). */
export interface LoginRequest {
  email: string;
  password: string;
}

/**
 * POST /api/v1/auth/login response (SRS §4.2).
 * Also returned by /auth/refresh and /auth/switch-branch (token fields).
 */
export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  token_type: 'Bearer';
  expires_in: number;
  user: User;
}

/** Token-only response from /auth/refresh. */
export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: 'Bearer';
  expires_in: number;
}

/** POST /api/v1/auth/refresh request body. */
export interface RefreshRequest {
  refresh_token: string;
}

/** POST /api/v1/auth/switch-branch request body. */
export interface SwitchBranchRequest {
  branch_id: string;
}
