import { useQuery } from "@tanstack/react-query";

import { listActions } from "@/lib/api";
import { queryKeys } from "./keys";

interface UseListStatsQueryOptions {
  enabled?: boolean;
}

export function useListStatsQuery(
  listId: number,
  { enabled = true }: UseListStatsQueryOptions = {},
) {
  const hasListId = Number.isFinite(listId) && listId > 0;

  return useQuery({
    queryKey: queryKeys.lists.stats(listId),
    queryFn: () => listActions.getStats(listId),
    enabled: enabled && hasListId,
    staleTime: 60_000,
  });
}
