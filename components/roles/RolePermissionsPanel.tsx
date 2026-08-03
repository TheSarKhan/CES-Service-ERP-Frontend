'use client';

import { useMemo } from 'react';
import { Check, ShieldCheck, X } from 'lucide-react';
import { usePermissionCatalog, useRolePermissions } from '@/hooks/use-roles';
import { Skeleton } from '@/components/ui/skeleton';
import { permissionModuleLabel } from '@/lib/constants/permission-modules';
import { cn } from '@/lib/utils';
import type { HttpMethod, Permission } from '@/types/role';

const CRUD_METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'DELETE'];
const CENTERED: React.CSSProperties = { textAlign: 'center' };

interface ModuleRow {
  module: string;
  crud: Partial<Record<HttpMethod, Permission>>;
  other: Permission[];
  grantedCount: number;
}

/**
 * Same shape as {@link PermissionMatrixEditor} — modules as rows, CRUD methods as columns — but
 * read-only, so grants render as ✓/✗ instead of checkboxes.
 *
 * Modules where the role holds nothing are dropped: the panel answers "what can this role do, and
 * what is it missing inside that", and a wall of ✗ rows for untouched modules just reprints the
 * catalog under every role.
 */
function buildRows(catalog: Permission[], grantedIds: Set<string>): ModuleRow[] {
  const byModule = new Map<string, ModuleRow>();
  for (const perm of catalog) {
    let row = byModule.get(perm.module);
    if (!row) {
      row = { module: perm.module, crud: {}, other: [], grantedCount: 0 };
      byModule.set(perm.module, row);
    }
    if (perm.permType === 'CRUD' && perm.httpMethod) {
      row.crud[perm.httpMethod] = perm;
    } else {
      row.other.push(perm);
    }
    if (grantedIds.has(perm.id)) row.grantedCount += 1;
  }

  return Array.from(byModule.values())
    .filter((row) => row.grantedCount > 0)
    .sort((a, b) =>
      permissionModuleLabel(a.module).localeCompare(permissionModuleLabel(b.module), 'az'),
    );
}

/** ✓ granted · ✗ exists but not granted. */
function GrantMark({ granted }: { granted: boolean }) {
  return granted ? (
    <Check className="mx-auto h-4 w-4 text-ok" aria-label="var" />
  ) : (
    <X className="mx-auto h-4 w-4 text-danger opacity-60" aria-label="yoxdur" />
  );
}

/** Left panel of a role's expand row: the role × permission matrix, limited to reachable modules. */
export function RolePermissionsPanel({ roleId }: { roleId: string }) {
  const { data: granted, isLoading } = useRolePermissions(roleId);
  const { data: catalog, isLoading: catalogLoading } = usePermissionCatalog();

  const grantedIds = useMemo(() => new Set((granted ?? []).map((p) => p.id)), [granted]);
  const rows = useMemo(
    () => (catalog && granted ? buildRows(catalog, grantedIds) : []),
    [catalog, granted, grantedIds],
  );

  const loading = isLoading || catalogLoading;

  return (
    <div>
      <h4 className="mb-3 flex items-center gap-2 text-sm font-bold">
        <ShieldCheck className="h-4 w-4 text-gold" />
        İcazəli modullar
      </h4>

      {loading && (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      )}

      {!loading && rows.length === 0 && (
        <p className="text-sm text-muted-foreground">Bu rolun heç bir icazəsi yoxdur.</p>
      )}

      {!loading && rows.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-line">
          <table className="tbl w-full">
            <thead>
              <tr>
                <th>Modul</th>
                {CRUD_METHODS.map((method) => (
                  <th key={method} className="w-chk" style={CENTERED}>
                    {method}
                  </th>
                ))}
                <th>Digər icazələr</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.module}>
                  <td className="font-semibold">{permissionModuleLabel(row.module)}</td>
                  {CRUD_METHODS.map((method) => {
                    const perm = row.crud[method];
                    return (
                      <td key={method} style={CENTERED}>
                        {perm ? (
                          <GrantMark granted={grantedIds.has(perm.id)} />
                        ) : (
                          // The module has no permission of this kind at all — distinct from
                          // having one the role wasn't given.
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                    );
                  })}
                  <td>
                    {row.other.length === 0 ? (
                      <span className="text-muted-foreground">—</span>
                    ) : (
                      <div className="flex flex-col gap-1">
                        {row.other.map((perm) => {
                          const isGranted = grantedIds.has(perm.id);
                          return (
                            <span
                              key={perm.id}
                              title={perm.description ?? perm.code}
                              className={cn(
                                'flex items-center gap-1.5 text-[12.5px]',
                                !isGranted && 'text-muted-foreground',
                              )}
                            >
                              {isGranted ? (
                                <Check className="h-3.5 w-3.5 shrink-0 text-ok" />
                              ) : (
                                <X className="h-3.5 w-3.5 shrink-0 text-danger opacity-60" />
                              )}
                              {perm.name}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
