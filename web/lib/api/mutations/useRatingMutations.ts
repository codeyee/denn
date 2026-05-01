import { useMutation, useQueryClient, type QueryClient } from "@tanstack/react-query";

import { useToast } from "@/app/_components/common/Toast";
import { ratingActions } from "@/lib/api";
import { queryKeys } from "@/lib/api/queries/keys";
import type { ContentItem, Rating, RatingCreate } from "@/lib/types";

interface UpsertRatingVariables {
  contentItem: ContentItem;
  currentRating?: Rating | null;
  data: RatingCreate;
  userId?: number;
}

interface DeleteRatingVariables {
  contentItemId: number;
  ratingId: number;
  userId?: number;
}

export function useUpsertUserRatingMutation() {
  const qc = useQueryClient();
  const { showToast } = useToast();

  return useMutation<Rating, Error, UpsertRatingVariables>({
    mutationFn: ({ contentItem, currentRating, data }) => {
      if (currentRating) {
        return ratingActions.patch(currentRating.id, {
          score: data.score,
          comment: data.comment,
        });
      }

      return ratingActions.create({
        source_api: contentItem.source_api,
        external_id: contentItem.external_id,
        content_type: contentItem.content_type,
        score: data.score,
        comment: data.comment,
      });
    },
    onError: (error) => {
      showToast(error.message || "No se pudo guardar la calificacion", "error");
    },
    onSettled: (_data, _error, vars) => {
      invalidateRatingResources(qc, vars.contentItem.id, vars.userId);
    },
  });
}

export function useDeleteRatingMutation() {
  const qc = useQueryClient();
  const { showToast } = useToast();

  return useMutation<void, Error, DeleteRatingVariables>({
    mutationFn: ({ ratingId }) => ratingActions.delete(ratingId),
    onError: (error) => {
      showToast(error.message || "No se pudo eliminar la calificacion", "error");
    },
    onSettled: (_data, _error, vars) => {
      invalidateRatingResources(qc, vars.contentItemId, vars.userId);
    },
  });
}

function invalidateRatingResources(
  qc: QueryClient,
  contentItemId: number,
  userId?: number,
) {
  qc.invalidateQueries({ queryKey: queryKeys.ratings.all });
  qc.invalidateQueries({ queryKey: queryKeys.contentDetail.all });
  if (userId) {
    qc.invalidateQueries({
      queryKey: queryKeys.ratings.byUser(contentItemId, userId),
    });
  }
}
