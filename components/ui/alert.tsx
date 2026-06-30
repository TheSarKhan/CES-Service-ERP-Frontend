import * as React from 'react';
import { cn } from '@/lib/utils';

export type AlertVariant = 'info' | 'ok' | 'warn' | 'danger';

const VARIANT_CLASS: Record<AlertVariant, string> = {
  info: 'al-info',
  ok: 'al-ok',
  warn: 'al-warn',
  danger: 'al-danger',
};

export interface AlertProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  variant?: AlertVariant;
  title?: React.ReactNode;
  icon?: React.ReactNode;
}

/** Inline alert (kit `.alert` + `.al-*`). */
export function Alert({
  className,
  variant = 'info',
  title,
  icon,
  children,
  ...props
}: AlertProps) {
  return (
    <div className={cn('alert', VARIANT_CLASS[variant], className)} {...props}>
      {icon && <span className="al-ic">{icon}</span>}
      <div className="al-body">
        {title && <b>{title}</b>}
        {children && <span>{children}</span>}
      </div>
    </div>
  );
}
