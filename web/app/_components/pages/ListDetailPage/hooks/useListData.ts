import { useCallback, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";

import {
  LIST_DETAIL_METADATA_PARAMS,
  LIST_VIEWER_SOURCE_FIELDS,
  useFullListItemsQuery,
  useListItemsQuery,
  useListStatsQuery,
  useUserListQuery,
  queryKeys,
} from "@/lib/api/queries";
import type {
  ListItem,
  ListStatsResponse,
  PaginatedListItemList,
  PaginationMetadata,
  UserListDetail,
} from "@/lib/types";
import type { ListItemQuery } from "@/lib/types/listView";

interface UseListDataOptions {
  listId: number;
  query: ListItemQuery;
  country?: string | null;
}

interface UseListDataReturn {
  loading: boolean;
  itemsLoading: boolean;
  fullItemsLoading: boolean;
  error: string | null;
  list: UserListDetail | null;
  pageItems: ListItem[];
  fullItems: ListItem[] | null;
  totalItemCount: number;
  pageMetadata: PaginationMetadata | null;
  stats: ListStatsResponse | null;
  setList: React.Dispatch<React.SetStateAction<UserListDetail | null>>;
  setPageItems: React.Dispatch<React.SetStateAction<ListItem[]>>;
  setFullItems: React.Dispatch<React.SetStateAction<ListItem[] | null>>;
  setTotalItemCount: React.Dispatch<React.SetStateAction<number>>;
  setStats: React.Dispatch<React.SetStateAction<ListStatsResponse | null>>;
  refetchMetadata: () => Promise<void>;
  refetchCurrentPage: () => Promise<void>;
  refetchStats: () => Promise<void>;
  ensureFullItems: () => Promise<ListItem[]>;
}

export function useListData({
  listId,
  query,
  country,
}: UseListDataOptions): UseListDataReturn {
  const qc = useQueryClient();
  const itemOptions = useMemo(
    () => ({
      country: country ?? undefined,
      expand: "content_item",
      source_fields: LIST_VIEWER_SOURCE_FIELDS,
      query: {
        filters: query.filters,
        rangeFilters: query.rangeFilters,
        sort: query.sort,
        groupBy: query.groupBy,
      },
    }),
    [country, query.filters, query.groupBy, query.rangeFilters, query.sort],
  );

  const metadata = useUserListQuery(listId, LIST_DETAIL_METADATA_PARAMS);
  const stats = useListStatsQuery(listId);
  const items = useListItemsQuery(listId, {
    page: query.page,
    pageSize: query.pageSize,
    options: itemOptions,
  });
  const fullItems = useFullListItemsQuery(listId, {
    ...itemOptions,
    enabled: false,
  });

  const pageKey = queryKeys.listItems.page(listId, {
    page: query.page,
    pageSize: query.pageSize,
    options: itemOptions,
  });
  const fullKey = queryKeys.listItems.full(listId, itemOptions);

  const setList = useCallback<UseListDataReturn["setList"]>(
    (updater) => {
      qc.setQueryData<UserListDetail | null>(
        queryKeys.lists.detail(listId, LIST_DETAIL_METADATA_PARAMS),
        (prev) => resolveUpdate(updater, prev ?? null),
      );
    },
    [listId, qc],
  );

  const setPageItems = useCallback<UseListDataReturn["setPageItems"]>(
    (updater) => {
      qc.setQueryData<PaginatedListItemList>(pageKey, (prev) => {
        if (!prev) return prev;
        return { ...prev, results: resolveUpdate(updater, prev.results) };
      });
    },
    [pageKey, qc],
  );

  const setFullItems = useCallback<UseListDataReturn["setFullItems"]>(
    (updater) => {
      qc.setQueryData<ListItem[] | null>(fullKey, (prev) =>
        resolveUpdate(updater, prev ?? null),
      );
    },
    [fullKey, qc],
  );

  const setStats = useCallback<UseListDataReturn["setStats"]>(
    (updater) => {
      qc.setQueryData<ListStatsResponse | null>(
        queryKeys.lists.stats(listId),
        (prev) => resolveUpdate(updater, prev ?? null),
      );
    },
    [listId, qc],
  );

  const setTotalItemCount = useCallback<UseListDataReturn["setTotalItemCount"]>(
    (updater) => {
      qc.setQueryData<PaginatedListItemList>(pageKey, (prev) => {
        if (!prev) return prev;
        const nextCount = resolveUpdate(updater, prev.metadata.count);
        return {
          ...prev,
          metadata: {
            ...prev.metadata,
            count: nextCount,
            total_pages: Math.max(
              1,
              Math.ceil(nextCount / prev.metadata.page_size),
            ),
          },
        };
      });
    },
    [pageKey, qc],
  );

  const refetchMetadata = useCallback(async () => {
    await metadata.refetch();
  }, [metadata]);

  const refetchStats = useCallback(async () => {
    await stats.refetch();
  }, [stats]);

  const refetchCurrentPage = useCallback(async () => {
    await items.refetch();
  }, [items]);

  const ensureFullItems = useCallback(async () => {
    if (fullItems.data) return fullItems.data;
    const result = await fullItems.refetch();
    return result.data ?? [];
  }, [fullItems]);

  const pageMetadata = items.data?.metadata ?? null;
  const totalItemCount = pageMetadata?.count ?? 0;
  const error = firstError(metadata.error, stats.error, items.error);

  return {
    loading: metadata.isLoading || items.isLoading,
    itemsLoading: items.isFetching && !items.isPlaceholderData,
    fullItemsLoading: fullItems.isFetching,
    error,
    list: metadata.data ?? null,
    pageItems: items.data?.results ?? [],
    fullItems: fullItems.data ?? null,
    totalItemCount,
    pageMetadata,
    stats: stats.data ?? null,
    setList,
    setPageItems,
    setFullItems,
    setTotalItemCount,
    setStats,
    refetchMetadata,
    refetchCurrentPage,
    refetchStats,
    ensureFullItems,
  };
}

function resolveUpdate<T>(updater: React.SetStateAction<T>, previous: T): T {
  return typeof updater === "function"
    ? (updater as (current: T) => T)(previous)
    : updater;
}

function firstError(...errors: unknown[]) {
  const error = errors.find(Boolean);
  return error instanceof Error ? error.message : error ? "Failed to load list" : null;
}
