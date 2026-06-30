import { cn } from '@/lib/utils';

/** Shimmer skeleton bar (kit `.skel`). Add a width via className. */
function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('skel', className)} {...props} />;
}

export { Skeleton };
