import { ItemStatus } from "@/lib/api/types";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: ItemStatus;
  className?: string;
  size?: "sm" | "md" | "lg";
}

const STATUS_CONFIG = {
  [ItemStatus.COMPLETED]: {
    label: "COMPLETED",
    className: "bg-green-500/20 text-green-400 border-green-500/30",
  },
  [ItemStatus.PENDING]: {
    label: "PENDING",
    className: "bg-white/10 text-white/80 border-white/20",
  },
} as const;

const SIZE_STYLES = {
  sm: "px-2 py-1 text-xs",
  md: "px-3 py-1.5 text-xs",
  lg: "px-4 py-2 text-sm",
} as const;

export function StatusBadge({ status, className, size = "md" }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status];

  if (!config) {
    return null;
  }

  return (
    <div
      className={cn(
        "rounded-full font-semibold border",
        SIZE_STYLES[size],
        config.className,
        className
      )}
    >
      {config.label}
    </div>
  );
}
