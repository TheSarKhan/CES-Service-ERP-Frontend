import axios from 'axios';
import { API_URL, apiPost } from './client';
import type {
  LoginRequest,
  LoginResponse,
  TokenResponse,
} from '@/types/auth';
import type { ApiResponse } from '@/types/api';

/**
 * Auth API surface (SRS §4.2). login/refresh are called pre-auth, so they use
 * a bare axios call to avoid the interceptor depending on an existing token.
 */

/** POST /api/v1/auth/login */
export async function login(payload: LoginRequest): Promise<LoginResponse> {
  const res = await axios.post<ApiResponse<LoginResponse>>(
    `${API_URL}/auth/login`,
    payload,
    { headers: { 'Content-Type': 'application/json' } },
  );
  return res.data.data;
}

/** POST /api/v1/auth/refresh */
export async function refresh(
  refreshToken: string,
  branchId?: string,
): Promise<TokenResponse> {
  const res = await axios.post<ApiResponse<TokenResponse>>(
    `${API_URL}/auth/refresh`,
    { refresh_token: refreshToken, branch_id: branchId },
    { headers: { 'Content-Type': 'application/json' } },
  );
  return res.data.data;
}

/** POST /api/v1/auth/logout — blacklists the current token (Bearer auth). */
export async function logout(): Promise<void> {
  await apiPost<void>('/auth/logout');
}

/**
 * POST /api/v1/auth/switch-branch — issues a fresh token bound to `branchId`
 * and returns the updated login payload (SRS §4.1 / §5.3).
 */
export async function switchBranch(branchId: string): Promise<LoginResponse> {
  return apiPost<LoginResponse>('/auth/switch-branch', {
    branch_id: branchId,
  });
}
