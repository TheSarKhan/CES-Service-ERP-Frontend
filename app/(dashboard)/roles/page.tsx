'use client';

import { Fragment, useState } from 'react';
import { ChevronDown, Search, ShieldCheck } from 'lucide-react';
import { useRoles } from '@/hooks/use-roles';
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
import { Pagination } from '@/components/ui/pagination';
import { Empty } from '@/components/ui/empty';
import { Alert } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { CreateRoleDialog } from '@/components/roles/CreateRoleDialog';
import { RolePermissionsPanel } from '@/components/roles/RolePermissionsPanel';
import { RoleUsersPanel } from '@/components/roles/RoleUsersPanel';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 20;
const COLUMN_COUNT = 4;

export default function RolesPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [expandedRoleId, setExpandedRoleId] = useState<string | null>(null);

  const { data, isLoading, isError, error } = useRoles({
    page,
    size: PAGE_SIZE,
    sort: 'name',
    dir: 'asc',
  });

  const allRoles = data?.items ?? [];
  const roles = search
    ? allRoles.filter(
        (role) =>
          role.name.toLowerCase().includes(search.toLowerCase()) ||
          role.code.toLowerCase().includes(search.toLowerCase()),
      )
    : allRoles;
  const meta = data?.meta;

  function toggleExpand(roleId: string) {
    setExpandedRoleId((current) => (current === roleId ? null : roleId));
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Rollar & İcazələr</h1>
          <p className="text-sm text-muted-foreground">
            Dinamik RBAC — rol × icazə matrisi (M16)
          </p>
        </div>
        <CreateRoleDialog />
      </div>

      {isError && (
        <Alert variant="danger" title="Məlumat yüklənmədi">
          {error instanceof Error ? error.message : 'Serverlə əlaqə qurulmadı.'}
        </Alert>
      )}

      <TableWrap>
        <TableTools>
          <div className="tt-left">
            <h3>Rol siyahısı</h3>
            <span className="muted">
              {meta ? `Cəmi ${meta.total_items} rol` : 'Yüklənir...'}
            </span>
          </div>
          <div className="tt-right">
            <Input
              inputSize="sm"
              placeholder="Axtarış (ad, kod)"
              icon={<Search className="h-4 w-4" />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </TableTools>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ad</TableHead>
              <TableHead>Açıqlama</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-act" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading &&
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={`skeleton-${i}`}>
                  {Array.from({ length: COLUMN_COUNT }).map((__, c) => (
                    <TableCell key={`sk-${i}-${c}`}>
                      <span className="skel w-70 block" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}

            {!isLoading &&
              !isError &&
              roles.map((role) => {
                const isExpanded = expandedRoleId === role.id;
                return (
                  <Fragment key={role.id}>
                    <TableRow>
                      <TableCell>
                        <b className="font-semibold">{role.name}</b>
                        <div className="mono text-xs text-muted-foreground">{role.code}</div>
                      </TableCell>
                      <TableCell>
                        <span className="text-muted-foreground">
                          {role.description || '—'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Badge variant={role.isActive ? 'ok' : 'mute'} dot>
                            {role.isActive ? 'Aktiv' : 'Deaktiv'}
                          </Badge>
                          {role.isSystem && (
                            <Badge variant="gold">
                              <ShieldCheck className="h-3 w-3" />
                              Sistem
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="r">
                        <button
                          type="button"
                          onClick={() => toggleExpand(role.id)}
                          aria-expanded={isExpanded}
                          aria-label="Rol təfərrüatlarını göstər"
                          className="btn btn-outline btn-icon"
                        >
                          <ChevronDown
                            className={cn(
                              'h-4 w-4 transition-transform',
                              isExpanded && 'rotate-180',
                            )}
                          />
                        </button>
                      </TableCell>
                    </TableRow>

                    {isExpanded && (
                      <TableRow>
                        <TableCell colSpan={COLUMN_COUNT} className="bg-graphite-50">
                          <div className="grid grid-cols-1 gap-6 py-2 md:grid-cols-2">
                            <RolePermissionsPanel roleId={role.id} />
                            <RoleUsersPanel roleId={role.id} />
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                );
              })}
          </TableBody>
        </Table>

        {!isLoading && !isError && roles.length === 0 && (
          <Empty
            title="Rol tapılmadı"
            description="Hələ heç bir rol yaradılmayıb — ilk rolu yaradaraq icazələri təyin edin."
            icon={<ShieldCheck className="mx-auto h-12 w-12" />}
            action={<CreateRoleDialog />}
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
    </div>
  );
}
