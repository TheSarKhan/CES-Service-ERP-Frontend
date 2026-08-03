import * as React from 'react';
import { cn } from '@/lib/utils';

/** Pill tone mapped to the kit's `.p-*` classes. */
export type BadgeVariant =
  | 'ok'
  | 'warn'
  | 'danger'
  | 'info'
  | 'mute'
  | 'gold'
  | 'solid'
  | 'outline';

const VARIANT_CLASS: Record<BadgeVariant, string> = {
  ok: 'p-ok',
  warn: 'p-warn',
  danger: 'p-danger',
  info: 'p-info',
  mute: 'p-mute',
  gold: 'p-gold',
  solid: 'p-solid',
  outline: 'p-outline',
};

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  /** Smaller pill (kit `.pill.sm`). */
  size?: 'sm' | 'default';
}

/** Status pill (kit `.pill`). */
function Badge({
  className,
  variant = 'mute',
  size = 'default',
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        'pill',
        VARIANT_CLASS[variant],
        size === 'sm' && 'sm',
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}

export { Badge };
