import { useQuery } from "@tanstack/react-query";

import { listActions } from "@/lib/api";
import type { ListQueryParams } from "@/lib/types";
import { queryKeys } from "./keys";

interface UseUserListsQueryOptions {
  enabled?: boolean;
}

/**
 * Fetch the authenticated user's lists. `staleTime: 60s` because lists
 * are mutated by user actions (create/delete/rename) which all run
 * through `useMutation` invalidations downstream — so polling is
 * unnecessary, and a 1-minute window absorbs accidental tab switches.
 */
export function useUserListsQuery(
  params?: ListQueryParams,
  options: UseUserListsQueryOptions = {},
) {
  return useQuery({
    queryKey: queryKeys.lists.list(params as Record<string, unknown> | undefined),
    queryFn: () => listActions.list(params),
    enabled: options.enabled ?? true,
    staleTime: 60_000,
  });
}
