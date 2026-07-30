'use client';

import { useMemo } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { permissionModuleLabel } from '@/lib/constants/permission-modules';
import type { HttpMethod, Permission } from '@/types/role';

const CRUD_METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'DELETE'];
const CENTERED: React.CSSProperties = { textAlign: 'center' };

interface ModuleRow {
  module: string;
  crud: Partial<Record<HttpMethod, Permission>>;
  other: Permission[];
}

/** Groups the flat permission catalog into module rows: 4 CRUD slots + "other". */
function groupByModule(permissions: Permission[]): ModuleRow[] {
  const byModule = new Map<string, ModuleRow>();
  for (const perm of permissions) {
    let row = byModule.get(perm.module);
    if (!row) {
      row = { module: perm.module, crud: {}, other: [] };
      byModule.set(perm.module, row);
    }
    if (perm.permType === 'CRUD' && perm.httpMethod) {
      row.crud[perm.httpMethod] = perm;
    } else {
      row.other.push(perm);
    }
  }
  return Array.from(byModule.values()).sort((a, b) =>
    permissionModuleLabel(a.module).localeCompare(permissionModuleLabel(b.module), 'az'),
  );
}

export interface PermissionMatrixEditorProps {
  /** Full permission catalog (all modules). */
  permissions: Permission[];
  /** Currently-selected permission ids (mutated via `onToggle`, not in place). */
  selectedIds: Set<string>;
  onToggle: (permission: Permission) => void;
}

/** Role × Permission matrix: modules as rows, GET/POST/PUT/DELETE + "other" as columns. */
export function PermissionMatrixEditor({
  permissions,
  selectedIds,
  onToggle,
}: PermissionMatrixEditorProps) {
  const rows = useMemo(() => groupByModule(permissions), [permissions]);

  return (
    <div className="table-wrap">
      <div className="overflow-x-auto">
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
                        <Checkbox
                          checked={selectedIds.has(perm.id)}
                          onChange={() => onToggle(perm)}
                          aria-label={`${permissionModuleLabel(row.module)} — ${perm.name}`}
                        />
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                  );
                })}
                <td>
                  {row.other.length === 0 ? (
                    <span className="text-muted-foreground">—</span>
                  ) : (
                    <div className="flex flex-col gap-1.5">
                      {row.other.map((perm) => (
                        <Checkbox
                          key={perm.id}
                          size="sm"
                          checked={selectedIds.has(perm.id)}
                          onChange={() => onToggle(perm)}
                        >
                          {perm.name}
                        </Checkbox>
                      ))}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
