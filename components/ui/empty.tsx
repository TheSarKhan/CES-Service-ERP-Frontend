import * as React from 'react';
import { cn } from '@/lib/utils';

export interface EmptyProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

/** Empty state (kit `.empty`). */
export function Empty({
  title,
  description,
  icon,
  action,
  className,
}: EmptyProps) {
  return (
    <div className={cn('empty', className)}>
      {icon && <div className="emp-art">{icon}</div>}
      <h3>{title}</h3>
      {description && <p>{description}</p>}
      {action}
    </div>
  );
}
