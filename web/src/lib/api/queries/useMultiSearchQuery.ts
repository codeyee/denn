import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { searchActions } from "@/lib/api/actions";
import type { MultiSearchResponse } from "@/lib/types";
import { queryKeys } from "./keys";

interface UseMultiSearchQueryOptions {
  limit?: number;
  country?: string | null;
  enabled?: boolean;
  initialData?: MultiSearchResponse;
}

export function useMultiSearchQuery(
  query: string,
  {
    limit = 20,
    country,
    enabled = true,
    initialData,
  }: UseMultiSearchQueryOptions = {},
) {
  const trimmedQuery = query.trim();

  return useQuery<MultiSearchResponse>({
    queryKey: queryKeys.search.multi({
      query: trimmedQuery,
      limit,
      country: country ?? null,
    }),
    queryFn: ({ signal }) =>
      searchActions.multiSearch(
        { q: trimmedQuery, limit },
        signal,
        country ?? undefined,
      ),
    enabled: enabled && trimmedQuery.length > 0,
    initialData,
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
}
