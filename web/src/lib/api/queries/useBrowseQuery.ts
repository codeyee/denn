import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { browseActions } from "@/lib/api/actions/browse";
import type { BrowseResponse, BrowseType } from "@/lib/types";
import { BROWSE_PAGE_SIZE } from "./constants";
import { queryKeys } from "./keys";

interface UseBrowseQueryOptions {
  country?: string | null;
  initialData?: BrowseResponse;
}

export function useBrowseQuery(
  type: BrowseType,
  page: number,
  sort: "popular" | "recent",
  query: string,
  { country, initialData }: UseBrowseQueryOptions = {},
) {
  return useQuery<BrowseResponse>({
    queryKey: queryKeys.browse.byParams({
      type,
      page,
      sort,
      query: query || undefined,
      country: country ?? null,
    }),
    queryFn: ({ signal }) =>
      browseActions.get(
        { type, page, sort, q: query || undefined },
        signal,
        country ?? undefined,
      ),
    initialData,
    placeholderData: keepPreviousData,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    enabled:
      page >= 1 &&
      page <= 100 &&
      page * BROWSE_PAGE_SIZE > 0,
  });
}
