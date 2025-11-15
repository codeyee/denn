import { ItemStatus } from "@/lib/api/types";
import { cn } from "@/lib/utils/tailwindUtils";

interface StatusBadgeProps {
  status: ItemStatus;
  className?: string;
  variant?: "default" | "compact";
}

const STATUS_CONFIG = {
  [ItemStatus.COMPLETED]: {
    label: "Completed",
    className: "bg-green-500/20 text-green-400 border-green-500/30",
  },
  [ItemStatus.PENDING]: {
    label: "Pending",
    className: "bg-white/10 text-white/80 border-white/20",
  },
} as const;

export function StatusBadge({
  status,
  className,
  variant = "default",
}: StatusBadgeProps) {
  const config = STATUS_CONFIG[status];

  return (
    <div
      className={cn(
        "rounded-full text-xs font-semibold border",
        variant === "compact" ? "px-2 py-1" : "px-3 py-1.5",
        config.className,
        className
      )}
    >
      {config.label}
    </div>
  );
}
