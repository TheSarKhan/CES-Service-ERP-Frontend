import * as React from 'react';
import { cn } from '@/lib/utils';

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
  wrapperClassName?: string;
}

/**
 * Multi-line text input rendered as the kit's wrapper structure:
 * `<div class="input is-textarea"> <textarea/> </div>`.
 */
const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, wrapperClassName, error, rows = 3, ...props }, ref) => {
    return (
      <div
        className={cn(
          'input is-textarea',
          error && 'is-error',
          props.disabled && 'is-disabled',
          wrapperClassName,
        )}
      >
        <textarea ref={ref} rows={rows} className={className} {...props} />
      </div>
    );
  },
);
Textarea.displayName = 'Textarea';

export { Textarea };
