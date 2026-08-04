'use client';

import { useEffect } from 'react';
import { forceLogout, refreshSession } from '@/lib/api/client';
import { useAuthStore } from '@/store/auth-store';

/**
 * Keeps the JWT session alive without the user noticing:
 *
 * - schedules a silent refresh shortly before the access token expires, so
 *   requests never even hit a 401;
 * - refreshes immediately on mount / tab focus when the token is already
 *   stale (e.g. the laptop woke from sleep);
 * - listens for `storage` events so a token pair rotated by another tab is
 *   adopted here instead of triggering a second (revoked) refresh.
 *
 * Mounted once from the root providers; renders nothing.
 */

/** Refresh this long before the access token actually expires. */
const REFRESH_EARLY_MS = 90_000;
/** Retry delay after a transient (network / 5xx) refresh failure. */
const RETRY_DELAY_MS = 30_000;
/** localStorage key used by the persisted auth store. */
const AUTH_STORAGE_KEY = 'ces-auth';

/** Extract `exp` (as epoch ms) from a JWT without verifying it. */
function decodeExpiryMs(token: string): number | null {
  try {
    const payload = token.split('.')[1];
    const json = JSON.parse(
      atob(payload.replace(/-/g, '+').replace(/_/g, '/')),
    ) as { exp?: number };
    return typeof json.exp === 'number' ? json.exp * 1000 : null;
  } catch {
    return null;
  }
}

export function AuthSessionKeeper(): null {
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let disposed = false;

    const clear = () => {
      if (timer) clearTimeout(timer);
      timer = undefined;
    };

    const refreshNow = async () => {
      if (useAuthStore.getState().refreshToken === null) return;
      try {
        const token = await refreshSession();
        // `null` = the server rejected the refresh token -> session is dead.
        // On success the store change triggers the subscriber -> reschedule.
        if (token === null) forceLogout();
      } catch {
        if (!disposed) {
          clear();
          timer = setTimeout(() => void refreshNow(), RETRY_DELAY_MS);
        }
      }
    };

    const schedule = () => {
      clear();
      const { accessToken, refreshToken, hasHydrated } = useAuthStore.getState();
      if (!hasHydrated || !refreshToken) return;

      const expMs = accessToken ? decodeExpiryMs(accessToken) : null;
      if (expMs === null) {
        // No (readable) access token but a refresh token exists — recover now.
        void refreshNow();
        return;
      }
      // Jitter spreads refreshes across tabs so usually only one rotates the
      // pair; the others adopt it via the storage listener before their timer.
      const jitter = Math.random() * 15_000;
      const delay = expMs - Date.now() - REFRESH_EARLY_MS - jitter;
      if (delay <= 0) {
        void refreshNow();
        return;
      }
      timer = setTimeout(() => void refreshNow(), delay);
    };

    const unsubscribe = useAuthStore.subscribe((state, prev) => {
      if (
        state.accessToken !== prev.accessToken ||
        state.refreshToken !== prev.refreshToken ||
        state.hasHydrated !== prev.hasHydrated
      ) {
        schedule();
      }
    });

    // Waking a laptop / returning to the tab: timers may not have fired while
    // the page was throttled, so check the token age eagerly.
    const onVisibility = () => {
      if (document.visibilityState !== 'visible') return;
      const { accessToken, refreshToken } = useAuthStore.getState();
      if (!refreshToken) return;
      const expMs = accessToken ? decodeExpiryMs(accessToken) : null;
      if (expMs === null || expMs - Date.now() < REFRESH_EARLY_MS) {
        void refreshNow();
      } else {
        schedule();
      }
    };

    // Another tab rotated (or cleared) the tokens — mirror it into this tab.
    const onStorage = (event: StorageEvent) => {
      if (event.key !== AUTH_STORAGE_KEY) return;
      void useAuthStore.persist.rehydrate();
    };

    schedule();
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('storage', onStorage);

    return () => {
      disposed = true;
      clear();
      unsubscribe();
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  return null;
}
