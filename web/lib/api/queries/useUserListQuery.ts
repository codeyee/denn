import { useQuery } from "@tanstack/react-query";

import { listActions } from "@/lib/api";
import type { ListQueryParams } from "@/lib/types";
import { queryKeys } from "./keys";

/**
 * Fetch a single list's metadata (not its items — that lives in
 * `useListItemsQuery`). `staleTime: 30s` so renames/avatar changes
 * propagate quickly without thrashing the API.
 */
export function useUserListQuery(id: number, params?: ListQueryParams) {
  const enabled = Number.isFinite(id) && id > 0;

  return useQuery({
    queryKey: queryKeys.lists.detail(
      id,
      params as Record<string, unknown> | undefined,
    ),
    queryFn: () => listActions.get(id, params),
    enabled,
    staleTime: 30_000,
  });
}
