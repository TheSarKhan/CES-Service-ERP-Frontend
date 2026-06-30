'use client';

import { useQuery } from '@tanstack/react-query';
import { getVehicles } from '@/lib/api/vehicles';
import { useAuthStore } from '@/store/auth-store';
import type { VehicleListParams } from '@/types/vehicle';

/** Query key factory for vehicle queries. */
export const vehicleKeys = {
  all: ['vehicles'] as const,
  list: (branchId: string | null, params: VehicleListParams) =>
    [...vehicleKeys.all, 'list', branchId, params] as const,
};

/**
 * TanStack Query hook for the paginated vehicle list (M03). Re-fetches when the
 * active branch changes, since data is branch-scoped (SRS §5).
 */
export function useVehicles(params: VehicleListParams = {}) {
  const activeBranchId = useAuthStore((s) => s.activeBranchId);

  return useQuery({
    queryKey: vehicleKeys.list(activeBranchId, params),
    queryFn: () => getVehicles(params),
    enabled: Boolean(activeBranchId),
    staleTime: 30_000,
  });
}
