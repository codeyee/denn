import { useEffect, useState } from "react";

import { ContentTrackingControls } from "./ContentTrackingControls";
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
import { getTrackingEffectDescription } from "@/lib/utils/trackingEffects";

interface ListItemTrackingSectionProps {
  item: ListItem;
  onRate: (item: ListItem) => void;
  compact?: boolean;
}

export function ListItemTrackingSection({
  item,
  onRate,
  compact = false,
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
    } catch (error) {
      setTracking(previous);
      const effectText = getTrackingEffectDescription(error);
      if (
        effectText !== null &&
        window.confirm(
          `Changing progress will ${effectText || "update related activity"}. Continue?`,
        )
      ) {
        const updated = await setStatus.mutateAsync({
          contentId: item.content_item.id,
          status,
          acknowledgeEffects: true,
        });
        setTracking(updated);
      }
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
    const previous = tracking;
    setTracking(null);
    try {
      await removeTracking.mutateAsync({ contentId: item.content_item.id });
    } catch (error) {
      setTracking(previous);
      const effectText = getTrackingEffectDescription(error);
      if (
        effectText !== null &&
        window.confirm(
          `Stopping progress will ${effectText || "update related activity"}. Continue?`,
        )
      ) {
        setTracking(null);
        try {
          await removeTracking.mutateAsync({
            contentId: item.content_item.id,
            acknowledgeEffects: true,
          });
        } catch {
          setTracking(previous);
        }
      }
    }
  }

  return (
    <section
      aria-label="Your personal progress"
      onClick={(event) => event.stopPropagation()}
    >
      {!compact ? (
        <h4 className="mb-2 text-sm font-semibold text-white/80">
          Your progress
        </h4>
      ) : null}
      <ContentTrackingControls
        tracking={tracking}
        policy={item.content_item.progress_policy}
        disabled={disabled}
        onStatusChange={(status) => void changeStatus(status)}
        onFavoriteChange={(favorite) => void changeFavorite(favorite)}
        onRemove={() => void stopTracking()}
        compact={compact}
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
    is_favorite: status === "completed" ? current?.is_favorite ?? false : false,
    favorited_at:
      status === "completed" ? current?.favorited_at ?? null : null,
    created_at: current?.created_at ?? now,
    updated_at: now,
  };
}
