'use client';

import { useState, type ReactNode } from 'react';
import {
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query';
import { AuthSessionKeeper } from '@/lib/auth/session-keeper';

/**
 * Client-side providers: a per-app TanStack Query client plus the silent
 * JWT session keeper. The Zustand auth store hydrates itself from
 * localStorage via its `persist` middleware, so no explicit hydration
 * wrapper is required here.
 */
export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <AuthSessionKeeper />
      {children}
    </QueryClientProvider>
  );
}
