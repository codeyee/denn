import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { dynamicCollectionActions } from "@/lib/api";
import { queryKeys } from "./keys";
import type { DynamicCollectionsResponse } from "@/lib/types";

export function useDynamicCollectionsQuery(
  enabled = true,
  initialData?: DynamicCollectionsResponse,
) {
  return useQuery({
    queryKey: queryKeys.dynamicCollections.all,
    queryFn: dynamicCollectionActions.list,
    enabled,
    initialData,
    staleTime: 30_000,
  });
}

export function useDynamicCollectionItemsQuery(
  key: string,
  params: { page?: number; pageSize?: number; q?: string; sort?: string },
) {
  return useQuery({
    queryKey: queryKeys.dynamicCollections.items(key, params),
    queryFn: () => dynamicCollectionActions.items(key, params),
    enabled: Boolean(key),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
}
