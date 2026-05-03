import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { ratingActions } from "@/lib/api";
import { queryKeys } from "./keys";

interface UseRatingsListQueryOptions {
  pageSize?: number;
  enabled?: boolean;
}

export function useRatingsListQuery(
  contentItemId: number,
  page: number,
  { pageSize = 10, enabled = true }: UseRatingsListQueryOptions = {},
) {
  const hasContentItemId = Number.isFinite(contentItemId) && contentItemId > 0;

  return useQuery({
    queryKey: queryKeys.ratings.list(contentItemId, page, pageSize),
    queryFn: () =>
      ratingActions.list({
        content_item_id: contentItemId,
        page,
        page_size: pageSize,
      }),
    enabled: enabled && hasContentItemId,
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
}

export function useUserRatingQuery(contentItemId?: number, userId?: number) {
  const hasParams =
    Number.isFinite(contentItemId) &&
    Number(contentItemId) > 0 &&
    Number.isFinite(userId) &&
    Number(userId) > 0;

  return useQuery({
    queryKey: queryKeys.ratings.byUser(Number(contentItemId), Number(userId)),
    queryFn: async () => {
      const response = await ratingActions.list({
        content_item_id: Number(contentItemId),
        user_id: Number(userId),
        page_size: 1,
      });
      return response.results[0] ?? null;
    },
    enabled: hasParams,
    staleTime: 30_000,
  });
}
