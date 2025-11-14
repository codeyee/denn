/**
 * StatusBadge Component
 *
 * Reusable status badge component that displays item status (COMPLETED/PENDING)
 * with consistent styling across the application.
 *
 * This component eliminates 22+ instances of duplicated status badge JSX.
 */

import { cn } from '@/lib/utils';
import { ItemStatus } from '@/lib/api/types';

/**
 * Configuration for status badge styles and labels
 */
const STATUS_CONFIG = {
  [ItemStatus.COMPLETED]: {
    label: 'Completed',
    className: 'bg-green-500/20 text-green-400 border-green-500/30',
  },
  [ItemStatus.PENDING]: {
    label: 'Pending',
    className: 'bg-white/10 text-white/80 border-white/20',
  },
} as const;

/**
 * Props for the StatusBadge component
 */
export interface StatusBadgeProps {
  /**
   * The item status to display
   */
  status: ItemStatus;

  /**
   * Optional additional CSS classes
   */
  className?: string;

  /**
   * Size variant of the badge
   * @default 'default'
   */
  size?: 'sm' | 'default' | 'lg';
}

/**
 * Size-specific styling classes
 */
const SIZE_VARIANTS = {
  sm: 'px-2 py-1 text-[10px]',
  default: 'px-3 py-1.5 text-xs',
  lg: 'px-4 py-2 text-sm',
} as const;

/**
 * StatusBadge component
 *
 * Displays a styled badge indicating the status of a list item
 *
 * @example
 * ```tsx
 * <StatusBadge status={ItemStatus.COMPLETED} />
 * <StatusBadge status={ItemStatus.PENDING} size="sm" />
 * <StatusBadge status={item.status} className="ml-2" />
 * ```
 */
export function StatusBadge({
  status,
  className,
  size = 'default',
}: StatusBadgeProps) {
  const config = STATUS_CONFIG[status];

  return (
    <div
      className={cn(
        'rounded-full font-semibold border inline-block',
        SIZE_VARIANTS[size],
        config.className,
        className
      )}
    >
      {config.label}
    </div>
  );
}

/**
 * Compact variant - displays just an indicator dot
 *
 * @example
 * ```tsx
 * <StatusBadgeDot status={ItemStatus.COMPLETED} />
 * ```
 */
export function StatusBadgeDot({
  status,
  className,
}: Omit<StatusBadgeProps, 'size'>) {
  const config = STATUS_CONFIG[status];

  return (
    <div
      className={cn(
        'w-2 h-2 rounded-full',
        status === ItemStatus.COMPLETED ? 'bg-green-400' : 'bg-white/40',
        className
      )}
      title={config.label}
      aria-label={config.label}
    />
  );
}
