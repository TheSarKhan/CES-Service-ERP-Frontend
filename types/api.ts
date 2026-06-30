/**
 * Standard API response envelope (SRS §6.2).
 */

/** Pagination metadata, present only on list responses. */
export interface PageMeta {
  page: number;
  size: number;
  total_pages: number;
  total_items: number;
}

/** Successful response envelope. */
export interface ApiResponse<T> {
  success: true;
  data: T;
  meta?: PageMeta;
  timestamp: string;
}

/** A single field/validation error detail. */
export interface ApiErrorDetail {
  field?: string;
  message: string;
}

/** Error payload returned on 4xx / 5xx (SRS §6.2). */
export interface ApiError {
  code: string;
  message: string;
  details?: ApiErrorDetail[];
}

/** Failure response envelope. */
export interface ApiErrorResponse {
  success: false;
  error: ApiError;
  timestamp: string;
}

/**
 * A list payload paired with its pagination meta — the shape the api client
 * surfaces to callers for list endpoints.
 */
export interface PageResponse<T> {
  items: T[];
  meta: PageMeta;
}

/** Standard list query parameters (SRS §6.3). */
export interface PageParams {
  page?: number;
  size?: number;
  sort?: string;
  dir?: 'asc' | 'desc';
  search?: string;
}
