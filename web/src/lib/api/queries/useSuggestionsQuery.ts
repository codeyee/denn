import { useQuery } from "@tanstack/react-query";

import { homepageActions } from "@/lib/api";
import type { HomepageResponse } from "@/lib/types";
import { queryKeys } from "./keys";

interface UseSuggestionsQueryOptions {
  country?: string | null;
  enabled?: boolean;
  initialData?: HomepageResponse;
}

export function useSuggestionsQuery(
  limit: number,
  { country, enabled = true, initialData }: UseSuggestionsQueryOptions = {},
) {
  return useQuery({
    queryKey: queryKeys.suggestions.byParams({ limit, country: country ?? null }),
    queryFn: () =>
      homepageActions.getSuggestions({
        limit,
        country: country ?? undefined,
      }),
    enabled: enabled && Number.isFinite(limit) && limit > 0,
    initialData,
    staleTime: 5 * 60_000,
  });
}
