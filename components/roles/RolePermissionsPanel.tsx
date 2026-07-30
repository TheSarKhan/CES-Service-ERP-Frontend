'use client';

import { useMemo } from 'react';
import { ShieldCheck } from 'lucide-react';
import { useRolePermissions } from '@/hooks/use-roles';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { permissionModuleLabel } from '@/lib/constants/permission-modules';
import type { Permission } from '@/types/role';

function groupByModule(permissions: Permission[]): Map<string, Permission[]> {
  const byModule = new Map<string, Permission[]>();
  for (const perm of permissions) {
    const bucket = byModule.get(perm.module) ?? [];
    bucket.push(perm);
    byModule.set(perm.module, bucket);
  }
  return byModule;
}

/** Left panel of a role's expand row: modules the role has access to + its permissions in each. */
export function RolePermissionsPanel({ roleId }: { roleId: string }) {
  const { data: permissions, isLoading } = useRolePermissions(roleId);

  const groups = useMemo(
    () =>
      Array.from(groupByModule(permissions ?? []).entries()).sort(([a], [b]) =>
        permissionModuleLabel(a).localeCompare(permissionModuleLabel(b), 'az'),
      ),
    [permissions],
  );

  return (
    <div>
      <h4 className="mb-3 flex items-center gap-2 text-sm font-bold">
        <ShieldCheck className="h-4 w-4 text-gold" />
        İcazəli modullar
      </h4>

      {isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      )}

      {!isLoading && groups.length === 0 && (
        <p className="text-sm text-muted-foreground">Bu rolun heç bir icazəsi yoxdur.</p>
      )}

      {!isLoading && groups.length > 0 && (
        <ul className="space-y-2.5">
          {groups.map(([module, perms]) => (
            <li key={module} className="rounded-lg border border-line bg-surface px-3 py-2.5">
              <div className="mb-1.5 text-[13px] font-semibold">
                {permissionModuleLabel(module)}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {perms.map((perm) => (
                  <Badge key={perm.id} variant="mute" size="sm" title={perm.name}>
                    {perm.httpMethod ?? perm.name}
                  </Badge>
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
