import axios, {
  AxiosError,
  AxiosHeaders,
  type AxiosInstance,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios';
import type { ApiErrorResponse, ApiResponse } from '@/types/api';
import { useAuthStore } from '@/store/auth-store';

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080';

/** Resolved REST base URL (SRS §6.1 — all endpoints under /api/v1). */
export const API_URL = `${API_BASE.replace(/\/$/, '')}/api/v1`;

/**
 * Raw axios instance. Most callers should use the unwrapping helpers below
 * (`apiGet`, `apiList`, ...) rather than this instance directly.
 */
export const httpClient: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30_000,
});

// --- Request interceptor: attach Bearer token + X-Branch-Id (SRS §4 / §5.6).
httpClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const { accessToken, activeBranchId } = useAuthStore.getState();
  const headers = AxiosHeaders.from(config.headers);

  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }
  if (activeBranchId) {
    headers.set('X-Branch-Id', activeBranchId);
  }
  config.headers = headers;
  return config;
});

/** Internal flag so we only attempt a single refresh per failed request. */
interface RetriableConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

// A single in-flight refresh promise shared across concurrent 401s.
let refreshPromise: Promise<string | null> | null = null;

async function performRefresh(): Promise<string | null> {
  const { refreshToken } = useAuthStore.getState();
  if (!refreshToken) return null;

  try {
    // Use a bare axios call to avoid recursive interceptors.
    const res = await axios.post<ApiResponse<{
      access_token: string;
      refresh_token: string;
    }>>(`${API_URL}/auth/refresh`, { refresh_token: refreshToken });

    const data = res.data?.data;
    if (!data?.access_token) return null;

    useAuthStore
      .getState()
      .setTokens(data.access_token, data.refresh_token ?? refreshToken);
    return data.access_token;
  } catch {
    return null;
  }
}

// --- Response interceptor: unwrap envelope + one-shot refresh on 401.
httpClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError<ApiErrorResponse>) => {
    const original = error.config as RetriableConfig | undefined;

    if (error.response?.status === 401 && original && !original._retry) {
      original._retry = true;

      refreshPromise = refreshPromise ?? performRefresh();
      const newToken = await refreshPromise;
      refreshPromise = null;

      if (newToken) {
        const headers = AxiosHeaders.from(original.headers);
        headers.set('Authorization', `Bearer ${newToken}`);
        original.headers = headers;
        return httpClient(original);
      }

      // Refresh failed -> hard logout.
      useAuthStore.getState().logout();
    }

    return Promise.reject(error);
  },
);

/**
 * Narrowed error class carrying the parsed backend error envelope so callers
 * can branch on `code` (SRS §6.5).
 */
export class ApiRequestError extends Error {
  readonly code: string;
  readonly status?: number;
  readonly details?: ApiErrorResponse['error']['details'];

  constructor(error: AxiosError<ApiErrorResponse>) {
    const payload = error.response?.data;
    super(payload?.error?.message ?? error.message);
    this.name = 'ApiRequestError';
    this.code = payload?.error?.code ?? 'UNKNOWN_ERROR';
    this.status = error.response?.status;
    this.details = payload?.error?.details;
  }
}

function toApiError(error: unknown): never {
  if (axios.isAxiosError(error)) {
    throw new ApiRequestError(error as AxiosError<ApiErrorResponse>);
  }
  throw error;
}

/** GET that unwraps `{ data }` and returns the payload. */
export async function apiGet<T>(
  url: string,
  params?: object,
): Promise<T> {
  try {
    const res = await httpClient.get<ApiResponse<T>>(url, { params });
    return res.data.data;
  } catch (error) {
    toApiError(error);
  }
}

/** GET a list endpoint, returning items + pagination meta (SRS §6.2). */
export async function apiList<T>(
  url: string,
  params?: object,
): Promise<{ items: T[]; meta: ApiResponse<T[]>['meta'] }> {
  try {
    const res = await httpClient.get<ApiResponse<T[]>>(url, { params });
    return { items: res.data.data, meta: res.data.meta };
  } catch (error) {
    toApiError(error);
  }
}

/** POST that unwraps the response payload. */
export async function apiPost<T>(url: string, body?: unknown): Promise<T> {
  try {
    const res = await httpClient.post<ApiResponse<T>>(url, body);
    return res.data.data;
  } catch (error) {
    toApiError(error);
  }
}

/**
 * POST a `FormData` body (file upload). The instance sets a default JSON `Content-Type`, which
 * would otherwise override axios's automatic multipart boundary — clearing it here lets the
 * browser set the correct `multipart/form-data; boundary=...` header itself.
 */
export async function apiPostForm<T>(url: string, formData: FormData): Promise<T> {
  try {
    const res = await httpClient.post<ApiResponse<T>>(url, formData, {
      headers: { 'Content-Type': undefined },
    });
    return res.data.data;
  } catch (error) {
    toApiError(error);
  }
}

/** PUT that unwraps the response payload. */
export async function apiPut<T>(url: string, body?: unknown): Promise<T> {
  try {
    const res = await httpClient.put<ApiResponse<T>>(url, body);
    return res.data.data;
  } catch (error) {
    toApiError(error);
  }
}

/** PATCH that unwraps the response payload. */
export async function apiPatch<T>(url: string, body?: unknown): Promise<T> {
  try {
    const res = await httpClient.patch<ApiResponse<T>>(url, body);
    return res.data.data;
  } catch (error) {
    toApiError(error);
  }
}

/**
 * DELETE (soft delete). Usually 204 with no body (SRS §6.4), but endpoints behind the approval
 * queue answer 202 with the created request — so the payload is unwrapped when there is one, and
 * `T` defaults to `void` for the plain 204 case.
 */
export async function apiDelete<T = void>(url: string): Promise<T> {
  try {
    const res = await httpClient.delete<ApiResponse<T>>(url);
    return res.data?.data as T;
  } catch (error) {
    toApiError(error);
  }
}
