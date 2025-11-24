import { cn } from "@/lib/utils/tailwindUtils";

interface RatingBadgeProps {
  rating: number | null;
  count?: number;
  variant: "user" | "list";
  className?: string;
  size?: "default" | "compact";
}

const RATING_CONFIG = {
  user: {
    label: "My Rating",
    className: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  },
  list: {
    label: "List Avg",
    className: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  },
} as const;

export function RatingBadge({
  rating,
  count,
  variant,
  className,
  size = "compact",
}: RatingBadgeProps) {
  if (rating === null || rating === undefined) {
    return null;
  }

  const config = RATING_CONFIG[variant];

  return (
    <div
      className={cn(
        "rounded-full text-xs font-semibold border inline-flex items-center gap-1",
        size === "compact" ? "px-2 py-1" : "px-3 py-1.5",
        config.className,
        className
      )}
    >
      <span>★</span>
      <span>{rating.toFixed(1)}</span>
      {count !== undefined && count > 1 && (
        <span className="opacity-70 ml-0.5">({count})</span>
      )}
    </div>
  );
}
