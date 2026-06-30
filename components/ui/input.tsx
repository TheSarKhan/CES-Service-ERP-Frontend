import * as React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Error state -> kit `.input.is-error` wrapper. */
  error?: boolean;
  /** Smaller variant -> kit `.input.sm`. */
  inputSize?: 'sm' | 'default';
  /** Optional leading icon -> kit `.input.has-icon`. */
  icon?: React.ReactNode;
  /** Extra classes applied to the wrapper `.input` element. */
  wrapperClassName?: string;
}

/**
 * Text input rendered as the kit's wrapper structure:
 * `<div class="input"> [icon] <input/> </div>`.
 */
const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    { className, wrapperClassName, error, inputSize = 'default', icon, ...props },
    ref,
  ) => {
    return (
      <div
        className={cn(
          'input',
          inputSize === 'sm' && 'sm',
          icon && 'has-icon',
          error && 'is-error',
          props.disabled && 'is-disabled',
          wrapperClassName,
        )}
      >
        {icon}
        <input ref={ref} className={className} {...props} />
      </div>
    );
  },
);
Input.displayName = 'Input';

export { Input };
