'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import * as authApi from '@/lib/api/auth';
import type { LoginRequest } from '@/types/auth';

/**
 * Thin React wrapper over the auth store that also wires in navigation and the
 * auth API. Components should prefer this over touching the store directly.
 */
export function useAuth() {
  const router = useRouter();

  const user = useAuthStore((s) => s.user);
  const activeBranchId = useAuthStore((s) => s.activeBranchId);
  const accessToken = useAuthStore((s) => s.accessToken);
  const setAuth = useAuthStore((s) => s.setAuth);
  const setActiveBranch = useAuthStore((s) => s.setActiveBranch);
  const logoutStore = useAuthStore((s) => s.logout);
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const hasRole = useAuthStore((s) => s.hasRole);

  const isAuthenticated = Boolean(accessToken && user);

  /** Perform a login and route to the dashboard home ("/"). */
  const login = useCallback(
    async (credentials: LoginRequest) => {
      const result = await authApi.login(credentials);
      setAuth(result);
      router.replace('/');
      return result;
    },
    [router, setAuth],
  );

  /** Switch the active branch (new token) without losing the session. */
  const switchBranch = useCallback(
    async (branchId: string) => {
      const result = await authApi.switchBranch(branchId);
      // switch-branch returns a fresh login payload (new token bound to branch).
      setAuth(result);
      setActiveBranch(branchId);
      return result;
    },
    [setActiveBranch, setAuth],
  );

  /** Best-effort server logout, then clear local state and redirect. */
  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // Ignore network/blacklist errors — we still clear local state.
    } finally {
      logoutStore();
      router.replace('/login');
    }
  }, [logoutStore, router]);

  return {
    user,
    activeBranchId,
    isAuthenticated,
    hasPermission,
    hasRole,
    login,
    logout,
    switchBranch,
  };
}
