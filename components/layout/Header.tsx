'use client';

import { Bell, ChevronDown, LogOut, UserRound } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { BranchSwitcher } from './BranchSwitcher';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, toInitials } from '@/components/ui/avatar';

/**
 * Top bar: branch switcher + notification bell (kit `.dot-badge`) + user menu
 * with avatar (kit `.av`) and logout.
 */
export function Header() {
  const router = useRouter();
  const { user, logout } = useAuth();

  return (
    <header className="flex h-16 items-center justify-between border-b border-line bg-surface px-6">
      <div className="flex items-center gap-3">
        <BranchSwitcher />
      </div>

      <div className="flex items-center gap-3">
        <button type="button" className="dot-badge" aria-label="Bildirişlər">
          <Bell className="h-[18px] w-[18px]" />
          <i aria-hidden />
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex items-center gap-2 rounded-md px-1.5 py-1 hover:bg-graphite-50"
            >
              <Avatar
                size="sm"
                initials={user ? toInitials(user.full_name) : '—'}
              />
              <span className="hidden text-sm font-semibold sm:inline">
                {user?.full_name ?? 'İstifadəçi'}
              </span>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col">
                <span className="font-semibold">{user?.full_name}</span>
                <span className="text-xs font-normal text-muted-foreground">
                  {user?.email}
                </span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => router.push('/profile')}>
              <UserRound className="h-4 w-4" />
              <span>Profilim</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={() => void logout()}
              className="text-danger focus:text-danger"
            >
              <LogOut className="h-4 w-4" />
              <span>Çıxış</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
