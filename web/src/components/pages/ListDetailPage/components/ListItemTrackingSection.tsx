import { useEffect, useState } from "react";

import { ContentTrackingControls } from "@/components/pages/ContentDetailPage/components/ContentTrackingControls";
import {
  useDeleteTrackingMutation,
  useSetFavoriteMutation,
  useSetTrackingStatusMutation,
} from "@/lib/api/mutations";
import type {
  ListItem,
  TrackingStatus,
  UserContentTracking,
} from "@/lib/types";

interface ListItemTrackingSectionProps {
  item: ListItem;
  onRate: (item: ListItem) => void;
}

export function ListItemTrackingSection({
  item,
  onRate,
}: ListItemTrackingSectionProps) {
  const [tracking, setTracking] = useState<UserContentTracking | null>(
    item.content_item.current_user_tracking ?? null,
  );
  const setStatus = useSetTrackingStatusMutation();
  const setFavorite = useSetFavoriteMutation();
  const removeTracking = useDeleteTrackingMutation();
  const disabled =
    setStatus.isPending || setFavorite.isPending || removeTracking.isPending;

  useEffect(() => {
    setTracking(item.content_item.current_user_tracking ?? null);
  }, [item.content_item.current_user_tracking]);

  async function changeStatus(status: TrackingStatus) {
    const previous = tracking;
    setTracking(optimisticTracking(item.content_item.id, tracking, status));
    try {
      const updated = await setStatus.mutateAsync({
        contentId: item.content_item.id,
        status,
      });
      setTracking(updated);
      if (updated.should_prompt_rating) onRate(item);
    } catch {
      setTracking(previous);
    }
  }

  async function changeFavorite(isFavorite: boolean) {
    const previous = tracking;
    if (tracking) {
      setTracking({
        ...tracking,
        is_favorite: isFavorite,
        favorited_at: isFavorite ? new Date().toISOString() : null,
      });
    }
    try {
      setTracking(
        await setFavorite.mutateAsync({
          contentId: item.content_item.id,
          isFavorite,
        }),
      );
    } catch {
      setTracking(previous);
    }
  }

  async function stopTracking() {
    if (!window.confirm("Stop tracking this content?")) return;
    const previous = tracking;
    setTracking(null);
    try {
      await removeTracking.mutateAsync({ contentId: item.content_item.id });
    } catch {
      setTracking(previous);
    }
  }

  return (
    <section aria-label="Your personal tracking">
      <h4 className="mb-2 text-sm font-semibold text-white/80">
        Your tracking
      </h4>
      <ContentTrackingControls
        tracking={tracking}
        disabled={disabled}
        onStatusChange={(status) => void changeStatus(status)}
        onFavoriteChange={(favorite) => void changeFavorite(favorite)}
        onRemove={() => void stopTracking()}
      />
    </section>
  );
}

function optimisticTracking(
  contentId: number,
  current: UserContentTracking | null,
  status: TrackingStatus,
): UserContentTracking {
  const now = new Date().toISOString();
  return {
    content_id: contentId,
    status,
    last_completed_at:
      status === "completed" ? (current?.last_completed_at ?? now) : null,
    is_favorite: current?.is_favorite ?? false,
    favorited_at: current?.favorited_at ?? null,
    created_at: current?.created_at ?? now,
    updated_at: now,
  };
}
