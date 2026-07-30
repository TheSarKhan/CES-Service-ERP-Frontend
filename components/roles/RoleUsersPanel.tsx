'use client';

import { Users } from 'lucide-react';
import { useRoleUsers } from '@/hooks/use-roles';
import { Avatar, toInitials } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

/** Right panel of a role's expand row: the users currently holding this role. */
export function RoleUsersPanel({ roleId }: { roleId: string }) {
  const { data: users, isLoading } = useRoleUsers(roleId);

  return (
    <div>
      <h4 className="mb-3 flex items-center gap-2 text-sm font-bold">
        <Users className="h-4 w-4 text-gold" />
        Bu roldakı istifadəçilər
        {users && <span className="text-muted-foreground">({users.length})</span>}
      </h4>

      {isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      )}

      {!isLoading && users?.length === 0 && (
        <p className="text-sm text-muted-foreground">Bu rolda heç bir istifadəçi yoxdur.</p>
      )}

      {!isLoading && users && users.length > 0 && (
        <ul className="space-y-2">
          {users.map((user) => (
            <li
              key={user.id}
              className="flex items-center gap-3 rounded-lg border border-line bg-surface px-3 py-2"
            >
              <Avatar initials={toInitials(user.fullName)} size="sm" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13.5px] font-semibold">{user.fullName}</div>
                <div className="truncate text-xs text-muted-foreground">{user.email}</div>
              </div>
              <Badge variant={user.isActive ? 'ok' : 'mute'} size="sm" dot>
                {user.isActive ? 'Aktiv' : 'Deaktiv'}
              </Badge>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
