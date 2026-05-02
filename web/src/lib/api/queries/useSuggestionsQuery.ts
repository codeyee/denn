import { useQuery } from "@tanstack/react-query";

import { homepageActions } from "@/lib/api";
import { queryKeys } from "./keys";

interface UseSuggestionsQueryOptions {
  country?: string | null;
  enabled?: boolean;
}

export function useSuggestionsQuery(
  limit: number,
  { country, enabled = true }: UseSuggestionsQueryOptions = {},
) {
  return useQuery({
    queryKey: queryKeys.suggestions.byParams({ limit, country: country ?? null }),
    queryFn: () =>
      homepageActions.getSuggestions({
        limit,
        country: country ?? undefined,
      }),
    enabled: enabled && Number.isFinite(limit) && limit > 0,
    staleTime: 5 * 60_000,
  });
}
