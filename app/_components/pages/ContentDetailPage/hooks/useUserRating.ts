import { useEffect, useState, useRef, useCallback } from "react";
import { ratingActions, contentItemActions } from "@/lib/api";
import { Rating, RatingCreate, ContentItem, User } from "@/lib/api/types";

interface UseUserRatingParams {
  contentItem: ContentItem | null;
  user: User | null;
}

interface UseUserRatingReturn {
  userRating: Rating | null;
  isRatingLoading: boolean;
  ratingRefreshKey: number;
  handleSubmitRating: (data: RatingCreate) => Promise<void>;
  handleDeleteRating: () => Promise<void>;
  setContentItem: (item: ContentItem) => void;
}

export function useUserRating({
  contentItem,
  user
}: UseUserRatingParams): UseUserRatingReturn {
  const [userRating, setUserRating] = useState<Rating | null>(null);
  const [isRatingLoading, setIsRatingLoading] = useState(false);
  const [ratingRefreshKey, setRatingRefreshKey] = useState(0);
  const [internalContentItem, setInternalContentItem] = useState<ContentItem | null>(contentItem);
  const userRatingFetchRef = useRef<{ contentItemId: number | null; userId: number | null }>({
    contentItemId: null,
    userId: null
  });

  useEffect(() => {
    setInternalContentItem(contentItem);
  }, [contentItem]);

  useEffect(() => {
    const fetchUserRating = async () => {
      if (!contentItem?.id || !user?.id) {
        setUserRating(null);
        userRatingFetchRef.current = { contentItemId: null, userId: null };
        return;
      }

      if (
        userRatingFetchRef.current.contentItemId === contentItem.id &&
        userRatingFetchRef.current.userId === user.id
      ) {
        return;
      }

      userRatingFetchRef.current = { contentItemId: contentItem.id, userId: user.id };

      try {
        const ratingsResponse = await ratingActions.list({
          content_item_id: contentItem.id,
          user_id: user.id,
          page_size: 1,
        });

        if (
          userRatingFetchRef.current.contentItemId === contentItem.id &&
          userRatingFetchRef.current.userId === user.id
        ) {
          if (ratingsResponse.results.length > 0) {
            setUserRating(ratingsResponse.results[0]);
          } else {
            setUserRating(null);
          }
        }
      } catch (err) {
        console.warn("Could not fetch user rating:", err);
        if (
          userRatingFetchRef.current.contentItemId === contentItem.id &&
          userRatingFetchRef.current.userId === user.id
        ) {
          setUserRating(null);
        }
      }
    };

    fetchUserRating();
  }, [contentItem?.id, user?.id]);

  const handleSubmitRating = useCallback(async (data: RatingCreate) => {
    if (!internalContentItem) return;

    setIsRatingLoading(true);
    try {
      if (userRating) {
        const updatedRating = await ratingActions.patch(userRating.id, {
          score: data.score,
          comment: data.comment,
        });
        setUserRating(updatedRating);
      } else {
        const newRating = await ratingActions.create({
          source_api: internalContentItem.source_api,
          external_id: internalContentItem.external_id,
          content_type: internalContentItem.content_type,
          score: data.score,
          comment: data.comment,
        });
        setUserRating(newRating);
      }

      const updatedItem = await contentItemActions.get(internalContentItem.id);
      setInternalContentItem(updatedItem);

      setRatingRefreshKey((prev) => prev + 1);
    } catch (err) {
      throw err;
    } finally {
      setIsRatingLoading(false);
    }
  }, [userRating, internalContentItem]);

  const handleDeleteRating = useCallback(async () => {
    if (!userRating || !internalContentItem) return;

    setIsRatingLoading(true);
    try {
      await ratingActions.delete(userRating.id);
      setUserRating(null);

      const updatedItem = await contentItemActions.get(internalContentItem.id);
      setInternalContentItem(updatedItem);

      setRatingRefreshKey((prev) => prev + 1);
    } catch (err) {
      console.error("Error deleting rating:", err);
    } finally {
      setIsRatingLoading(false);
    }
  }, [userRating, internalContentItem]);

  return {
    userRating,
    isRatingLoading,
    ratingRefreshKey,
    handleSubmitRating,
    handleDeleteRating,
    setContentItem: setInternalContentItem
  };
}
