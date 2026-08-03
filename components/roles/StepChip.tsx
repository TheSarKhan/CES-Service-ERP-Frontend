'use client';

import { cn } from '@/lib/utils';

/** Numbered step indicator, shared by the create and edit role wizards so they read alike. */
export function StepChip({
  n,
  label,
  state,
}: {
  n: number;
  label: string;
  state: 'done' | 'on' | 'todo';
}) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={cn(
          'grid h-7 w-7 place-items-center rounded-full font-mono text-[13px] font-bold',
          state === 'done' && 'bg-graphite text-gold',
          state === 'on' && 'bg-gold text-white ring-4 ring-gold-100',
          state === 'todo' && 'bg-graphite-50 text-muted-foreground',
        )}
      >
        {n}
      </span>
      <span className={cn('text-[13.5px] font-bold', state === 'todo' && 'text-muted-foreground')}>
        {label}
      </span>
    </div>
  );
}
