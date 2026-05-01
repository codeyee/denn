import { useCallback } from "react";

import {
  useDeleteRatingMutation,
  useUpsertUserRatingMutation,
} from "@/lib/api/mutations";
import { useUserRatingQuery } from "@/lib/api/queries";
import type { ContentItem, Rating, RatingCreate, User } from "@/lib/types";

interface UseUserRatingParams {
  contentItem: ContentItem | null;
  user: User | null;
}

interface UseUserRatingReturn {
  userRating: Rating | null;
  isRatingLoading: boolean;
  handleSubmitRating: (data: RatingCreate) => Promise<void>;
  handleDeleteRating: () => Promise<void>;
}

export function useUserRating({
  contentItem,
  user,
}: UseUserRatingParams): UseUserRatingReturn {
  const userRating = useUserRatingQuery(contentItem?.id, user?.id);
  const upsertRating = useUpsertUserRatingMutation();
  const deleteRating = useDeleteRatingMutation();

  const handleSubmitRating = useCallback(
    async (data: RatingCreate) => {
      if (!contentItem) return;

      await upsertRating.mutateAsync({
        contentItem,
        currentRating: userRating.data,
        data,
        userId: user?.id,
      });
    },
    [contentItem, upsertRating, user?.id, userRating.data],
  );

  const handleDeleteRating = useCallback(async () => {
    if (!contentItem || !userRating.data) return;

    await deleteRating.mutateAsync({
      contentItemId: contentItem.id,
      ratingId: userRating.data.id,
      userId: user?.id,
    });
  }, [contentItem, deleteRating, user?.id, userRating.data]);

  return {
    userRating: userRating.data ?? null,
    isRatingLoading:
      userRating.isLoading || upsertRating.isPending || deleteRating.isPending,
    handleSubmitRating,
    handleDeleteRating,
  };
}
