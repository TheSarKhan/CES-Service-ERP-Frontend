'use client';

import * as React from 'react';
import * as LabelPrimitive from '@radix-ui/react-label';
import { cn } from '@/lib/utils';

/**
 * Form label. The kit styles labels via `.field > label`, so inside a
 * `<Field>` no extra class is needed; the className prop allows overrides.
 */
const Label = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root> & {
    required?: boolean;
  }
>(({ className, children, required, ...props }, ref) => (
  <LabelPrimitive.Root ref={ref} className={cn(className)} {...props}>
    {children}
    {required && <span className="req"> *</span>}
  </LabelPrimitive.Root>
));
Label.displayName = LabelPrimitive.Root.displayName;

/** Kit `.field` group wrapper (label + control + hint/err spacing). */
function Field({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('field', className)} {...props} />;
}

/** Kit `.hint` helper text. */
function FieldHint({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) {
  return <span className={cn('hint', className)} {...props} />;
}

/** Kit `.err` error text. */
function FieldError({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) {
  return <span className={cn('err', className)} {...props} />;
}

export { Label, Field, FieldHint, FieldError };
