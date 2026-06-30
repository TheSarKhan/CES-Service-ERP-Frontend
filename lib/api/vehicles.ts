import { apiDelete, apiGet, apiList, apiPatch, apiPost, apiPut } from './client';
import type { PageResponse } from '@/types/api';
import type {
  CreateVehicleRequest,
  Vehicle,
  VehicleListParams,
  VehicleStatus,
} from '@/types/vehicle';

/**
 * Vehicle (M03 Qaraj) API surface (SRS M03.2). Typed example demonstrating the
 * standard list/CRUD pattern over the shared api client.
 */

/** GET /api/v1/vehicles — paginated, filterable list. */
export async function getVehicles(
  params: VehicleListParams = {},
): Promise<PageResponse<Vehicle>> {
  const { items, meta } = await apiList<Vehicle>('/vehicles', params);
  return {
    items,
    meta: meta ?? {
      page: params.page ?? 1,
      size: params.size ?? items.length,
      total_pages: 1,
      total_items: items.length,
    },
  };
}

/** GET /api/v1/vehicles/{id} */
export async function getVehicle(id: string): Promise<Vehicle> {
  return apiGet<Vehicle>(`/vehicles/${id}`);
}

/** POST /api/v1/vehicles */
export async function createVehicle(
  body: CreateVehicleRequest,
): Promise<Vehicle> {
  return apiPost<Vehicle>('/vehicles', body);
}

/** PUT /api/v1/vehicles/{id} */
export async function updateVehicle(
  id: string,
  body: CreateVehicleRequest,
): Promise<Vehicle> {
  return apiPut<Vehicle>(`/vehicles/${id}`, body);
}

/** PATCH /api/v1/vehicles/{id}/status */
export async function updateVehicleStatus(
  id: string,
  status: VehicleStatus,
): Promise<Vehicle> {
  return apiPatch<Vehicle>(`/vehicles/${id}/status`, { status });
}

/** DELETE /api/v1/vehicles/{id} (soft delete) */
export async function deleteVehicle(id: string): Promise<void> {
  return apiDelete(`/vehicles/${id}`);
}
