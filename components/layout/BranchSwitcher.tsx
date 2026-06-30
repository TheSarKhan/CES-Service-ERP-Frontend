'use client';

import { useState } from 'react';
import { Building2, Check, ChevronDown } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

/**
 * Branch selector styled like the kit `.select`. Lists the user's branches and
 * calls switchBranch (new token) on selection (SRS §5.3 / §5.6).
 */
export function BranchSwitcher() {
  const { user, activeBranchId, switchBranch } = useAuth();
  const [pending, setPending] = useState(false);

  const branches = user?.branches ?? [];
  const active =
    branches.find((b) => b.id === activeBranchId) ?? branches[0] ?? null;

  if (branches.length === 0) return null;

  const handleSelect = async (branchId: string) => {
    if (branchId === activeBranchId || pending) return;
    setPending(true);
    try {
      await switchBranch(branchId);
    } finally {
      setPending(false);
    }
  };

  const onlyOne = branches.length < 2;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild disabled={onlyOne || pending}>
        <button
          type="button"
          className={cn(
            'select sm gap-2',
            (onlyOne || pending) && 'cursor-default opacity-90',
          )}
          style={{ minWidth: 200 }}
        >
          <span className="flex items-center gap-2 truncate">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <span className="truncate font-semibold">
              {active?.name ?? 'Filial seçin'}
            </span>
          </span>
          {!onlyOne && <ChevronDown className="h-4 w-4" />}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel>Filial seçimi</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {branches.map((branch) => (
          <DropdownMenuItem
            key={branch.id}
            onSelect={() => handleSelect(branch.id)}
          >
            <Check
              className={cn(
                'h-4 w-4 text-gold',
                branch.id === active?.id ? 'opacity-100' : 'opacity-0',
              )}
            />
            <span className="truncate">{branch.name}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
