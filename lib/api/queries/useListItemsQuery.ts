import { useQuery } from "@tanstack/react-query";

import { listItemActions } from "@/lib/api";
import type { ListItemQuery } from "@/lib/types/listView";
import { queryKeys } from "./keys";

interface UseListItemsParams {
  page?: number;
  pageSize?: number;
  options?: {
    country?: string;
    fields?: string;
    expand?: string;
    omit?: string;
    source_fields?: string;
    query?: Pick<ListItemQuery, "filters" | "rangeFilters" | "sort" | "groupBy">;
  };
}

/**
 * Fetch a paginated page of items in a list. `staleTime: 30s` matches
 * `useUserListQuery` because the two are usually rendered together on
 * the list detail page; aligning their windows keeps the UX consistent.
 */
export function useListItemsQuery(
  listId: number,
  { page, pageSize, options }: UseListItemsParams = {},
) {
  const enabled = Number.isFinite(listId) && listId > 0;

  return useQuery({
    queryKey: queryKeys.listItems.page(listId, { page, pageSize, options }),
    queryFn: () => listItemActions.list(listId, page, pageSize, options),
    enabled,
    staleTime: 30_000,
  });
}
