'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { ChangePasswordDialog } from '@/components/users/ChangePasswordDialog';

/**
 * Authenticated shell: sidebar + header + content. Guards auth on the client as
 * a second line of defence behind the edge middleware.
 */
export default function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const router = useRouter();
  const accessToken = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);
  const hasHydrated = useAuthStore((s) => s.hasHydrated);

  const isAuthenticated = Boolean(accessToken && user);
  // Set at login. Until it's cleared every screen sits behind a dialog that can't be dismissed —
  // the account is still usable by whoever issued the temporary password.
  const clearMustChangePassword = useAuthStore((s) => s.clearMustChangePassword);
  const mustChangePassword = Boolean(user?.must_change_password);

  useEffect(() => {
    if (hasHydrated && !isAuthenticated) {
      router.replace('/login');
    }
  }, [hasHydrated, isAuthenticated, router]);

  if (!hasHydrated || !isAuthenticated) {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <span className="spin big" aria-label="Yüklənir" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>

      <ChangePasswordDialog
        open={mustChangePassword}
        onOpenChange={() => {}}
        forced
        onChanged={clearMustChangePassword}
      />
    </div>
  );
}
