'use client';

import { useState } from 'react';
import { KeyRound, Pencil, Plus, Power, Search, Trash2, Users as UsersIcon } from 'lucide-react';
import {
  TableWrap,
  TableTools,
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Pagination } from '@/components/ui/pagination';
import { Empty } from '@/components/ui/empty';
import { Alert } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { UserFormDialog } from '@/components/users/UserFormDialog';
import { TemporaryPasswordDialog } from '@/components/users/TemporaryPasswordDialog';
import { useDeleteUser, useResetUserPassword, useSetUserActive, useUsers } from '@/hooks/use-users';
import { useAuthStore } from '@/store/auth-store';
import { ApiRequestError } from '@/lib/api/client';
import { formatDateTime } from '@/lib/utils/format';
import type { ManagedUser } from '@/types/user';

const PAGE_SIZE = 20;
const COLUMN_COUNT = 5;

type StatusFilter = 'all' | 'active' | 'inactive';

/** Turns the API's refusals into something the person reading them can act on. */
function describe(error: unknown, fallback: string): string {
  if (error instanceof ApiRequestError) {
    if (error.code === 'CANNOT_DEACTIVATE_SELF') return 'Öz hesabınızı deaktiv edə bilməzsiniz.';
    if (error.code === 'LAST_ADMIN') return 'Sistemdə ən azı bir administrator qalmalıdır.';
    if (error.code === 'USER_HAS_ACTIVE_WO') return 'Bu istifadəçinin aktiv iş sifarişləri var.';
  }
  return fallback;
}

export default function UsersPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [formOpen, setFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<ManagedUser | null>(null);
  const [deletingUser, setDeletingUser] = useState<ManagedUser | null>(null);
  const [resettingUser, setResettingUser] = useState<ManagedUser | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [issued, setIssued] = useState<{ email: string; password: string | null } | null>(null);

  const currentUserId = useAuthStore((s) => s.user?.id ?? null);
  const setActive = useSetUserActive();
  const deleteUser = useDeleteUser();
  const resetPassword = useResetUserPassword();

  const { data, isLoading, isError, error } = useUsers({
    page,
    size: PAGE_SIZE,
    isActive: status === 'all' ? undefined : status === 'active',
  });

  // The list endpoint has no text search, so the query filters the fetched page. Pagination is
  // hidden while searching, so the result never looks like it covered every page.
  const allUsers = data?.items ?? [];
  const users = search
    ? allUsers.filter((u) =>
        [u.fullName, u.email, u.position ?? ''].some((v) =>
          v.toLowerCase().includes(search.toLowerCase()),
        ),
      )
    : allUsers;
  const meta = data?.meta;

  async function handleToggleActive(user: ManagedUser) {
    setActionError(null);
    try {
      await setActive.mutateAsync({ id: user.id, active: !user.isActive });
    } catch (err) {
      setActionError(describe(err, 'Status dəyişdirilmədi.'));
    }
  }

  async function handleDelete() {
    if (!deletingUser) return;
    setActionError(null);
    try {
      await deleteUser.mutateAsync(deletingUser.id);
      setDeletingUser(null);
    } catch (err) {
      setActionError(describe(err, 'İstifadəçi silinmədi.'));
    }
  }

  async function handleReset() {
    if (!resettingUser) return;
    setActionError(null);
    try {
      const result = await resetPassword.mutateAsync(resettingUser.id);
      setIssued({ email: resettingUser.email, password: result.temporary_password });
      setResettingUser(null);
    } catch (err) {
      setActionError(describe(err, 'Parol sıfırlanmadı.'));
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">İstifadəçilər</h1>
          <p className="text-sm text-muted-foreground">
            Hesablar, rol təyinatı və parol idarəetməsi
          </p>
        </div>
        <Button
          variant="primary"
          onClick={() => {
            setEditingUser(null);
            setFormOpen(true);
          }}
        >
          <Plus className="h-4 w-4" />
          Yeni istifadəçi
        </Button>
      </div>

      {isError && (
        <Alert variant="danger" title="Məlumat yüklənmədi">
          {error instanceof Error ? error.message : 'Serverlə əlaqə qurulmadı.'}
        </Alert>
      )}
      {actionError && !deletingUser && !resettingUser && (
        <Alert variant="danger" title="Əməliyyat alınmadı">
          {actionError}
        </Alert>
      )}

      <TableWrap>
        <TableTools>
          <div className="tt-left">
            <h3>İstifadəçi siyahısı</h3>
            <span className="muted">{meta ? `Cəmi ${meta.total_items}` : 'Yüklənir...'}</span>
          </div>
          <div className="tt-right flex flex-wrap items-center gap-2">
            <Input
              inputSize="sm"
              placeholder="Axtarış (ad, email, vəzifə)"
              icon={<Search className="h-4 w-4" />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select
              className="h-9 rounded-[11px] border border-line bg-white px-3 text-sm"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value as StatusFilter);
                setPage(1);
              }}
            >
              <option value="all">Bütün statuslar</option>
              <option value="active">Aktiv</option>
              <option value="inactive">Deaktiv</option>
            </select>
          </div>
        </TableTools>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ad</TableHead>
              <TableHead>Vəzifə</TableHead>
              <TableHead>Son giriş</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-act" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading &&
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={`sk-${i}`}>
                  {Array.from({ length: COLUMN_COUNT }).map((__, c) => (
                    <TableCell key={`sk-${i}-${c}`}>
                      <span className="skel w-70 block" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}

            {!isLoading &&
              !isError &&
              users.map((user) => {
                const isSelf = user.id === currentUserId;
                return (
                  <TableRow key={user.id}>
                    <TableCell>
                      <b className="font-semibold">{user.fullName}</b>
                      <div className="text-xs text-muted-foreground">{user.email}</div>
                    </TableCell>
                    <TableCell>
                      <span className="text-muted-foreground">{user.position || '—'}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-muted-foreground">
                        {user.lastLoginAt ? formatDateTime(user.lastLoginAt) : 'heç vaxt'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge variant={user.isActive ? 'ok' : 'mute'}>
                          {user.isActive ? 'Aktiv' : 'Deaktiv'}
                        </Badge>
                        {isSelf && (
                          <Badge variant="gold" size="sm">
                            Siz
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="r">
                      <div className="flex items-center justify-end gap-0.5">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingUser(user);
                            setFormOpen(true);
                          }}
                          className="btn btn-ghost btn-icon"
                          aria-label="İstifadəçini redaktə et"
                          title="Redaktə et"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setActionError(null);
                            setResettingUser(user);
                          }}
                          className="btn btn-ghost btn-icon"
                          aria-label="Parolu sıfırla"
                          title="Parolu sıfırla"
                        >
                          <KeyRound className="h-4 w-4" />
                        </button>
                        {/* Deactivating or deleting yourself would end the session mid-action, and
                            the API refuses it — so the buttons are withheld rather than failing. */}
                        {!isSelf && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleToggleActive(user)}
                              className="btn btn-ghost btn-icon"
                              aria-label={user.isActive ? 'Deaktiv et' : 'Aktiv et'}
                              title={user.isActive ? 'Deaktiv et' : 'Aktiv et'}
                            >
                              <Power className={user.isActive ? 'h-4 w-4' : 'h-4 w-4 text-ok'} />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setActionError(null);
                                setDeletingUser(user);
                              }}
                              className="btn btn-ghost btn-icon"
                              aria-label="İstifadəçini sil"
                              title="Sil"
                            >
                              <Trash2 className="h-4 w-4 text-danger" />
                            </button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
          </TableBody>
        </Table>

        {!isLoading && !isError && users.length === 0 && (
          <Empty
            title={search ? 'Nəticə tapılmadı' : 'İstifadəçi yoxdur'}
            description={
              search
                ? 'Axtarış şərtlərinə uyğun istifadəçi yoxdur.'
                : 'İlk istifadəçini yaradaraq başlayın.'
            }
            icon={<UsersIcon className="mx-auto h-12 w-12" />}
          />
        )}

        {!isLoading && !isError && meta && meta.total_items > 0 && !search && (
          <Pagination
            page={page}
            totalPages={meta.total_pages}
            totalItems={meta.total_items}
            pageSize={meta.size || PAGE_SIZE}
            onPageChange={setPage}
          />
        )}
      </TableWrap>

      <UserFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        editingUser={editingUser}
        onCreated={(email, password) => setIssued({ email, password })}
      />

      <TemporaryPasswordDialog
        open={Boolean(issued?.password)}
        onOpenChange={(open) => !open && setIssued(null)}
        email={issued?.email ?? ''}
        password={issued?.password ?? null}
      />

      <ConfirmDialog
        open={Boolean(deletingUser)}
        onOpenChange={(open) => !open && setDeletingUser(null)}
        title="İstifadəçini sil"
        description={`“${deletingUser?.fullName ?? ''}” silinsin? Bu əməliyyat geri qaytarılmır.`}
        confirmLabel="Sil"
        error={actionError}
        loading={deleteUser.isPending}
        onConfirm={handleDelete}
      />

      <ConfirmDialog
        open={Boolean(resettingUser)}
        onOpenChange={(open) => !open && setResettingUser(null)}
        title="Parolu sıfırla"
        description={`“${resettingUser?.fullName ?? ''}” üçün yeni müvəqqəti parol yaradılsın? Köhnə parol dərhal etibarsız olacaq.`}
        confirmLabel="Sıfırla"
        error={actionError}
        loading={resetPassword.isPending}
        onConfirm={handleReset}
      />
    </div>
  );
}
