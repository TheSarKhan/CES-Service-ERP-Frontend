import * as React from 'react';
import { cn } from '@/lib/utils';

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

const SIZE_CLASS: Record<AvatarSize, string> = {
  xs: 'av-xs',
  sm: 'av-sm',
  md: 'av-md',
  lg: 'av-lg',
  xl: 'av-xl',
};

export interface AvatarProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Initials (or any short node) to render. */
  initials: string;
  size?: AvatarSize;
  /** Gold background variant (kit `.av.gold`). */
  gold?: boolean;
}

/** Initials avatar tile (kit `.av`). */
export function Avatar({
  className,
  initials,
  size = 'md',
  gold,
  ...props
}: AvatarProps) {
  return (
    <span
      className={cn('av', SIZE_CLASS[size], gold && 'gold', className)}
      {...props}
    >
      {initials}
    </span>
  );
}

/** Compute up-to-two-letter initials from a full name. */
export function toInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}
