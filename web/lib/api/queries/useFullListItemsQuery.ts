import { useQuery } from "@tanstack/react-query";

import { listItemActions } from "@/lib/api";
import type { ListItemQuery } from "@/lib/types/listView";
import { queryKeys } from "./keys";

interface UseFullListItemsQueryOptions {
  country?: string;
  fields?: string;
  expand?: string;
  omit?: string;
  source_fields?: string;
  query?: Pick<ListItemQuery, "filters" | "rangeFilters" | "sort" | "groupBy">;
  enabled?: boolean;
}

export function useFullListItemsQuery(
  listId: number,
  { enabled = false, ...options }: UseFullListItemsQueryOptions = {},
) {
  const hasListId = Number.isFinite(listId) && listId > 0;

  return useQuery({
    queryKey: queryKeys.listItems.full(listId, options),
    queryFn: () => listItemActions.listAll(listId, options),
    enabled: enabled && hasListId,
    staleTime: 30_000,
  });
}
