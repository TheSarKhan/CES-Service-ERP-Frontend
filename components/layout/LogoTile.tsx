import { cn } from '@/lib/utils';

export interface LogoTileProps {
  /** Pixel size of the square tile. */
  size?: number;
  className?: string;
}

/**
 * "CES" gold-on-graphite initials tile used as the brand mark fallback
 * (the kit references assets/ces-logo.png which does not exist).
 */
export function LogoTile({ size = 42, className }: LogoTileProps) {
  return (
    <span
      className={cn(
        'grid place-items-center bg-graphite font-extrabold text-gold',
        className,
      )}
      style={{
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.21),
        fontSize: Math.round(size * 0.32),
        letterSpacing: '0.02em',
        flex: 'none',
      }}
      aria-label="CES"
    >
      CES
    </span>
  );
}
