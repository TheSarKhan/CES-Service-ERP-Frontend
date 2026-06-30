/**
 * Vehicle (M03 Qaraj) domain types — matched to the SRS M03.1 DDL / M03.2 API.
 */

/** garage_type CHECK values (SRS M03.1). */
export type GarageType = 'COMPANY' | 'INVESTOR' | 'CUSTOMER';

/** vehicle status CHECK values (SRS M03.1). */
export type VehicleStatus = 'ACTIVE' | 'IN_SERVICE' | 'INACTIVE';

/** A single vehicle record (SRS M03.1 / M03.2 response). */
export interface Vehicle {
  id: string;
  branch_id: string;
  garage_type: GarageType;
  owner_id: string | null;
  make: string;
  model: string;
  year: number | null;
  chassis_number: string | null;
  serial_number: string | null;
  plate_number: string | null;
  vehicle_type: string | null;
  status: VehicleStatus;
  current_location: string | null;
  current_engine_hours: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

/** POST /api/v1/vehicles request body (SRS M03.2). */
export interface CreateVehicleRequest {
  garage_type: GarageType;
  owner_id?: string | null;
  make: string;
  model: string;
  year?: number | null;
  chassis_number?: string | null;
  serial_number?: string | null;
  plate_number?: string | null;
  vehicle_type?: string | null;
  current_location?: string | null;
  notes?: string | null;
}

/** GET /api/v1/vehicles query parameters (SRS M03.2). */
export interface VehicleListParams {
  garage_type?: GarageType;
  status?: VehicleStatus;
  make?: string;
  search?: string;
  page?: number;
  size?: number;
  sort?: string;
  dir?: 'asc' | 'desc';
}
