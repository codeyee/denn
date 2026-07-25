import { Heart, Trash2 } from "lucide-react";
import { useId } from "react";

import { Button } from "@/components/common/ui/Button";
import type { TrackingStatus, UserContentTracking } from "@/lib/types";

interface ContentTrackingControlsProps {
  tracking: UserContentTracking | null;
  disabled: boolean;
  onStatusChange: (status: TrackingStatus) => void;
  onFavoriteChange: (isFavorite: boolean) => void;
  onRemove: () => void;
}

const TRACKING_OPTIONS: Array<{ value: TrackingStatus; label: string }> = [
  { value: "backlog", label: "Backlog" },
  { value: "in_progress", label: "In progress" },
  { value: "completed", label: "Completed" },
  { value: "on_hold", label: "On hold" },
  { value: "dropped", label: "Dropped" },
];

export function ContentTrackingControls({
  tracking,
  disabled,
  onStatusChange,
  onFavoriteChange,
  onRemove,
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
        {TRACKING_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      {tracking && (
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
            <Heart
              className={
                tracking.is_favorite
                  ? "fill-rose-400 text-rose-400"
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
