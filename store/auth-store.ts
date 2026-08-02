import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { LoginResponse, User } from '@/types/auth';

/** Cookie the edge middleware reads to gate protected routes. */
const ACCESS_TOKEN_COOKIE = 'ces_access_token';
/** Cookie mirroring the active branch id (available to SSR / middleware). */
const BRANCH_COOKIE = 'ces_branch_id';

const ACCESS_TOKEN_MAX_AGE = 60 * 60; // 1h (SRS §4.1)
const BRANCH_MAX_AGE = 60 * 60 * 24 * 7; // 7d

function setCookie(name: string, value: string, maxAgeSeconds: number): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=${encodeURIComponent(
    value,
  )}; path=/; max-age=${maxAgeSeconds}; SameSite=Lax`;
}

function clearCookie(name: string): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=; path=/; max-age=0; SameSite=Lax`;
}

export interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: User | null;
  activeBranchId: string | null;
  /** False until the persisted state has been read back from localStorage. */
  hasHydrated: boolean;
  setHasHydrated: (hasHydrated: boolean) => void;

  /** True once an access token + user are present. */
  isAuthenticated: () => boolean;
  /** Permission check helper used to gate UI (SRS §4.4). */
  hasPermission: (code: string) => boolean;
  /** Role check helper. */
  hasRole: (role: string) => boolean;

  /** Persist a full login (or branch switch) result. */
  setAuth: (payload: LoginResponse) => void;
  /** Rotate just the tokens (e.g. after a silent refresh). */
  setTokens: (accessToken: string, refreshToken: string) => void;
  /** Update the active branch (after a successful switch-branch). */
  setActiveBranch: (branchId: string) => void;
  /** Wipe all auth state + cookies. */
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      activeBranchId: null,
      hasHydrated: false,
      setHasHydrated: (hasHydrated) => set({ hasHydrated }),

      isAuthenticated: () => Boolean(get().accessToken && get().user),

      hasPermission: (code) => {
        const user = get().user;
        if (!user) return false;
        return user.permissions.includes(code);
      },

      hasRole: (role) => {
        const user = get().user;
        if (!user) return false;
        return user.roles.includes(role);
      },

      setAuth: (payload) => {
        // Default active branch = the branch_id the backend selected, falling
        // back to the first branch in the list (SRS §5.3 default branch).
        const activeBranchId =
          payload.user.branch_id ?? payload.user.branches[0]?.id ?? null;

        setCookie(ACCESS_TOKEN_COOKIE, payload.access_token, ACCESS_TOKEN_MAX_AGE);
        if (activeBranchId) {
          setCookie(BRANCH_COOKIE, activeBranchId, BRANCH_MAX_AGE);
        }

        set({
          accessToken: payload.access_token,
          refreshToken: payload.refresh_token,
          user: payload.user,
          activeBranchId,
        });
      },

      setTokens: (accessToken, refreshToken) => {
        setCookie(ACCESS_TOKEN_COOKIE, accessToken, ACCESS_TOKEN_MAX_AGE);
        set({ accessToken, refreshToken });
      },

      setActiveBranch: (branchId) => {
        setCookie(BRANCH_COOKIE, branchId, BRANCH_MAX_AGE);
        const user = get().user;
        set({
          activeBranchId: branchId,
          user: user ? { ...user, branch_id: branchId } : user,
        });
      },

      logout: () => {
        clearCookie(ACCESS_TOKEN_COOKIE);
        clearCookie(BRANCH_COOKIE);
        set({
          accessToken: null,
          refreshToken: null,
          user: null,
          activeBranchId: null,
        });
      },
    }),
    {
      name: 'ces-auth',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        user: state.user,
        activeBranchId: state.activeBranchId,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);

/**
 * Non-reactive accessor for use outside React (e.g. Axios interceptors),
 * avoiding a hook call where one is not allowed.
 */
export function getAuthSnapshot(): Pick<
  AuthState,
  'accessToken' | 'refreshToken' | 'activeBranchId'
> {
  const { accessToken, refreshToken, activeBranchId } = useAuthStore.getState();
  return { accessToken, refreshToken, activeBranchId };
}
