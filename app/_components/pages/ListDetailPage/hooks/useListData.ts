import { useState, useEffect, useCallback, useRef } from "react";
import { listActions, listItemActions } from "@/lib/api";
import { ListItem, ListStatsResponse, PaginationMetadata, UserListDetail } from "@/lib/types";
import { ListItemQuery } from "@/lib/types/listView";

const VIEWER_SOURCE_FIELDS = "title,original_title,tv_show_name,image_url,authors";

interface UseListDataOptions {
  listId: number;
  query: ListItemQuery;
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

async function fetchListMetadata(listId: number): Promise<UserListDetail> {
  return listActions.get(listId, {
    expand: "owner,members",
    omit: "items",
  });
}

async function fetchListStats(listId: number): Promise<ListStatsResponse> {
  return listActions.getStats(listId);
}

async function fetchListPage(listId: number, query: ListItemQuery) {
  return listItemActions.list(listId, query.page, query.pageSize, {
    expand: "content_item",
    source_fields: VIEWER_SOURCE_FIELDS,
    query: {
      filters: query.filters,
      rangeFilters: query.rangeFilters,
      sort: query.sort,
      groupBy: query.groupBy,
    },
  });
}

async function fetchAllListItems(listId: number): Promise<ListItem[]> {
  return listItemActions.listAll(listId, {
    expand: "content_item",
    source_fields: VIEWER_SOURCE_FIELDS,
  });
}

function querySignature(query: ListItemQuery): string {
  return JSON.stringify({
    f: query.filters,
    r: query.rangeFilters,
    s: query.sort,
    g: query.groupBy,
    p: query.page,
    ps: query.pageSize,
  });
}

export function useListData({ listId, query }: UseListDataOptions): UseListDataReturn {
  const [loading, setLoading] = useState(true);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [fullItemsLoading, setFullItemsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [list, setList] = useState<UserListDetail | null>(null);
  const [pageItems, setPageItems] = useState<ListItem[]>([]);
  const [fullItems, setFullItems] = useState<ListItem[] | null>(null);
  const [stats, setStats] = useState<ListStatsResponse | null>(null);
  const [totalItemCount, setTotalItemCount] = useState(0);
  const [pageMetadata, setPageMetadata] = useState<PaginationMetadata | null>(null);

  const hasBootstrappedRef = useRef(false);
  const lastSignatureRef = useRef("");
  const queryRef = useRef(query);
  queryRef.current = query;

  const refetchMetadata = useCallback(async () => {
    const metadata = await fetchListMetadata(listId);
    setList(metadata);
  }, [listId]);

  const refetchStats = useCallback(async () => {
    const nextStats = await fetchListStats(listId);
    setStats(nextStats);
  }, [listId]);

  const refetchCurrentPage = useCallback(async () => {
    setItemsLoading(true);
    try {
      const response = await fetchListPage(listId, queryRef.current);
      setPageItems(response.results);
      setPageMetadata(response.metadata);
      setTotalItemCount(response.metadata.count);
      lastSignatureRef.current = querySignature(queryRef.current);
    } finally {
      setItemsLoading(false);
    }
  }, [listId]);

  const ensureFullItems = useCallback(async () => {
    if (fullItems) return fullItems;
    setFullItemsLoading(true);
    try {
      const items = await fetchAllListItems(listId);
      setFullItems(items);
      return items;
    } finally {
      setFullItemsLoading(false);
    }
  }, [fullItems, listId]);

  useEffect(() => {
    let cancelled = false;
    async function bootstrap() {
      setLoading(true);
      setError(null);
      setFullItems(null);
      setPageItems([]);
      hasBootstrappedRef.current = false;
      try {
        const [metadata, nextStats, response] = await Promise.all([
          fetchListMetadata(listId),
          fetchListStats(listId),
          fetchListPage(listId, queryRef.current),
        ]);
        if (cancelled) return;
        setList(metadata);
        setStats(nextStats);
        setPageItems(response.results);
        setPageMetadata(response.metadata);
        setTotalItemCount(response.metadata.count);
        hasBootstrappedRef.current = true;
        lastSignatureRef.current = querySignature(queryRef.current);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load list");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    bootstrap();
    return () => {
      cancelled = true;
    };
  }, [listId]);

  useEffect(() => {
    if (loading || !hasBootstrappedRef.current) return;
    const sig = querySignature(query);
    if (sig === lastSignatureRef.current) return;
    void refetchCurrentPage();
  }, [loading, query, refetchCurrentPage]);

  return {
    loading,
    itemsLoading,
    fullItemsLoading,
    error,
    list,
    pageItems,
    fullItems,
    totalItemCount,
    pageMetadata,
    stats,
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
