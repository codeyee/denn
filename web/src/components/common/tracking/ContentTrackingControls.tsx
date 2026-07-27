import { Star, Trash2 } from "lucide-react";
import { useId } from "react";

import { Button } from "@/components/common/ui/Button";
import type {
  ProgressPolicy,
  TrackingStatus,
  UserContentTracking,
} from "@/lib/types";

export interface ContentTrackingControlsProps {
  tracking: UserContentTracking | null;
  policy: ProgressPolicy;
  disabled: boolean;
  onStatusChange: (status: TrackingStatus) => void;
  onFavoriteChange: (isFavorite: boolean) => void;
  onRemove: () => void;
  compact?: boolean;
}

export function ContentTrackingControls({
  tracking,
  policy,
  disabled,
  onStatusChange,
  onFavoriteChange,
  onRemove,
  compact = false,
}: ContentTrackingControlsProps) {
  const isCompleted = tracking?.status === "completed";
  const statusId = useId();

  return (
    <div
      className="flex flex-wrap items-center gap-3"
      aria-label="Personal tracking"
    >
      <label className="sr-only" htmlFor={statusId}>
        Tracking status
      </label>
      <select
        id={statusId}
        value={tracking?.status ?? ""}
        disabled={disabled}
        onChange={(event) => {
          if (event.target.value) {
            onStatusChange(event.target.value as TrackingStatus);
          }
        }}
        className="min-h-11 rounded-md border border-white/20 bg-black/70 px-3 text-sm text-white outline-none transition-colors hover:border-white/40 focus-visible:ring-4 focus-visible:ring-white/70 disabled:opacity-50"
      >
        <option value="" disabled>
          Track this content
        </option>
        {policy.states.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      {tracking && !compact && (
        <>
          <Button
            type="button"
            variant="outline"
            disabled={disabled || !isCompleted}
            aria-pressed={tracking.is_favorite}
            title={
              isCompleted
                ? undefined
                : "Favorites can only be changed while completed"
            }
            onClick={() => onFavoriteChange(!tracking.is_favorite)}
            className="border-white/20 bg-black/60 text-white hover:bg-white/10"
          >
            <Star
              className={
                tracking.is_favorite
                  ? "fill-amber-300 text-amber-300"
                  : "text-white"
              }
            />
            {tracking.is_favorite ? "Favorite" : "Add favorite"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            disabled={disabled}
            onClick={onRemove}
            className="text-white/75 hover:bg-white/10 hover:text-white"
          >
            <Trash2 />
            Stop tracking
          </Button>
        </>
      )}
    </div>
  );
}
