import * as React from 'react';
import { cn } from '@/lib/utils';

export interface CheckboxProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  /** Smaller box (kit `.chk.sm`). */
  size?: 'sm' | 'default';
  /** Dash-style indeterminate box (kit `.cb.cb-ind`), independent of `checked`. */
  indeterminate?: boolean;
}

/** Checkbox rendered as the kit's `<label class="chk"><input/><span class="cb"/>label</label>`. */
const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, size = 'default', indeterminate, children, ...props }, ref) => {
    return (
      <label className={cn('chk', size === 'sm' && 'sm', className)}>
        <input ref={ref} type="checkbox" {...props} />
        <span className={cn('cb', indeterminate && 'cb-ind')} />
        {children}
      </label>
    );
  },
);
Checkbox.displayName = 'Checkbox';

export { Checkbox };
