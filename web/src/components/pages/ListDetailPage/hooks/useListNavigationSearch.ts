import { useState, useMemo, useDeferredValue, useCallback } from "react";
import { ListItem } from "@/lib/types";
import { getListItemSubtitle, getListItemTitle } from "@/components/common/cards/ListItemCard/utils";
import { ListNavigationSearchResult } from "../components/ListNavigationSearch";

interface UseListNavigationSearchOptions {
  pageItems: ListItem[];
  fullItems: ListItem[] | null;
  ensureFullItems: () => Promise<ListItem[]>;
}

interface UseListNavigationSearchReturn {
  query: string;
  results: ListNavigationSearchResult[];
  isLoading: boolean;
  hasSearchedAll: boolean;
  canSearchAll: boolean;
  setQuery: (value: string) => void;
  clearQuery: () => void;
  searchAll: () => Promise<void>;
}

const MAX_RESULTS = 8;

function searchItems(
  items: ListItem[],
  query: string,
  isFullDataset: boolean,
): ListNavigationSearchResult[] {
  if (!query) return [];

  const results: ListNavigationSearchResult[] = [];

  for (const item of items) {
    const title = getListItemTitle(item);
    const subtitle = getListItemSubtitle(item);
    const matchesQuery = `${title} ${subtitle}`
      .toLowerCase()
      .includes(query);

    if (!matchesQuery) continue;

    results.push({
      id: item.id,
      title,
      subtitle,
      listOrder: item.list_order,
      pageIndex: isFullDataset ? items.indexOf(item) : undefined,
    });

    if (results.length === MAX_RESULTS) break;
  }

  return results;
}

export function useListNavigationSearch({
  pageItems,
  fullItems,
  ensureFullItems,
}: UseListNavigationSearchOptions): UseListNavigationSearchReturn {
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearchedAll, setHasSearchedAll] = useState(false);
  const deferredQuery = useDeferredValue(query.trim().toLowerCase());

  const results = useMemo(() => {
    if (!deferredQuery) return [];

    if (hasSearchedAll && fullItems) {
      return searchItems(fullItems, deferredQuery, true);
    }

    return searchItems(pageItems, deferredQuery, false);
  }, [deferredQuery, pageItems, fullItems, hasSearchedAll]);

  const canSearchAll = deferredQuery.length > 0 && !hasSearchedAll && results.length === 0;

  const searchAll = useCallback(async () => {
    setIsLoading(true);
    try {
      await ensureFullItems();
      setHasSearchedAll(true);
    } finally {
      setIsLoading(false);
    }
  }, [ensureFullItems]);

  const clearQuery = useCallback(() => {
    setQuery("");
    setHasSearchedAll(false);
  }, []);

  const handleSetQuery = useCallback((value: string) => {
    setQuery(value);
    if (!value.trim()) {
      setHasSearchedAll(false);
    }
  }, []);

  return {
    query,
    results,
    isLoading,
    hasSearchedAll,
    canSearchAll,
    setQuery: handleSetQuery,
    clearQuery,
    searchAll,
  };
}
