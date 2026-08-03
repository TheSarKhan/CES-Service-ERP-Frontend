import { apiDelete, apiGet, apiPatch, apiPost, apiPut } from './client';
import type { PageMeta, PageResponse } from '@/types/api';
import type {
  ChangeOwnPasswordRequest,
  CreatedUser,
  ManagedUser,
  ManagedUserDetail,
  OwnProfileRequest,
  UserListParams,
  UserRequest,
} from '@/types/user';

/** User administration (M15) API surface — same `{content, meta}` list envelope as roles. */

interface RawPage<T> {
  content: T[];
  meta: PageMeta;
}

export async function getUsers(params: UserListParams = {}): Promise<PageResponse<ManagedUser>> {
  const page = await apiGet<RawPage<ManagedUser>>('/users', params);
  return { items: page.content, meta: page.meta };
}

export async function getUser(id: string): Promise<ManagedUserDetail> {
  return apiGet<ManagedUserDetail>(`/users/${id}`);
}

/** Omit `password` to have the server issue a temporary one (the normal path). */
export async function createUser(body: UserRequest): Promise<CreatedUser> {
  return apiPost<CreatedUser>('/users', body);
}

export async function updateUser(id: string, body: UserRequest): Promise<ManagedUser> {
  return apiPut<ManagedUser>(`/users/${id}`, body);
}

export async function activateUser(id: string): Promise<ManagedUser> {
  return apiPatch<ManagedUser>(`/users/${id}/activate`);
}

export async function deactivateUser(id: string): Promise<ManagedUser> {
  return apiPatch<ManagedUser>(`/users/${id}/deactivate`);
}

export async function deleteUser(id: string): Promise<void> {
  return apiDelete(`/users/${id}`);
}

/** Bodyless call means "issue a new temporary password", which is returned once. */
export async function resetUserPassword(id: string): Promise<CreatedUser> {
  return apiPatch<CreatedUser>(`/users/${id}/reset-password`);
}

export async function assignUserRole(
  id: string,
  body: { roleId: string; branchId: string },
): Promise<void> {
  return apiPost<void>(`/users/${id}/roles`, body);
}

export async function revokeUserRole(
  id: string,
  roleId: string,
  branchId: string,
): Promise<void> {
  return apiDelete(`/users/${id}/roles/${roleId}?branchId=${branchId}`);
}

// ── self-service ─────────────────────────────────────────────────────────

export async function getOwnProfile(): Promise<ManagedUserDetail> {
  return apiGet<ManagedUserDetail>('/users/me');
}

export async function updateOwnProfile(body: OwnProfileRequest): Promise<ManagedUser> {
  return apiPut<ManagedUser>('/users/me', body);
}

export async function changeOwnPassword(body: ChangeOwnPasswordRequest): Promise<void> {
  return apiPost<void>('/users/me/change-password', body);
}
