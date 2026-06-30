import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cn } from '@/lib/utils';

/** Visual variants mapped to the kit's `.btn-*` classes. */
export type ButtonVariant =
  | 'primary'
  | 'gold'
  | 'secondary'
  | 'ghost'
  | 'outline'
  | 'danger'
  | 'success'
  | 'link';

/** Sizes mapped to the kit's `.btn-xs/sm/lg/xl` (default = base `.btn`). */
export type ButtonSize = 'xs' | 'sm' | 'default' | 'lg' | 'xl' | 'icon';

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  primary: 'btn-primary',
  gold: 'btn-gold',
  secondary: 'btn-secondary',
  ghost: 'btn-ghost',
  outline: 'btn-outline',
  danger: 'btn-danger',
  success: 'btn-success',
  link: 'btn-link',
};

const SIZE_CLASS: Record<ButtonSize, string> = {
  xs: 'btn-xs',
  sm: 'btn-sm',
  default: '',
  lg: 'btn-lg',
  xl: 'btn-xl',
  icon: 'btn-icon',
};

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  asChild?: boolean;
  /** Show the kit spinner (`.spin`) and disable the button. */
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'default',
      asChild = false,
      loading = false,
      disabled,
      children,
      ...props
    },
    ref,
  ) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn('btn', VARIANT_CLASS[variant], SIZE_CLASS[size], className)}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading && <span className="spin" aria-hidden />}
        {children}
      </Comp>
    );
  },
);
Button.displayName = 'Button';

export { Button };
