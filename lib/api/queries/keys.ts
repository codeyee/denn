/**
 * Sprint 08 / T6 — TanStack Query key factory.
 *
 * Centralising keys here gives us:
 *   - typed access from any caller (no copy/paste typos),
 *   - one place to update if the URL shape changes,
 *   - and a clean way to invalidate by prefix
 *     (e.g. `qc.invalidateQueries({ queryKey: queryKeys.lists.all })`).
 *
 * Every key is a tuple where the first element is the resource family
 * and subsequent elements are query parameters. This matches TanStack
 * Query's idiomatic pattern.
 */

import type { ListItemQuery } from "@/lib/types/listView";

interface ListItemsParams {
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

export const queryKeys = {
  lists: {
    all: ["lists"] as const,
    list: (params?: Record<string, unknown>) =>
      ["lists", "list", params ?? null] as const,
    detail: (id: number, params?: Record<string, unknown>) =>
      ["lists", "detail", id, params ?? null] as const,
  },
  listItems: {
    all: (listId: number) => ["list-items", listId] as const,
    page: (listId: number, params: ListItemsParams) =>
      ["list-items", listId, params] as const,
  },
  contentDetail: {
    all: ["content-detail"] as const,
    byId: (id: number, country?: string) =>
      ["content-detail", id, country ?? null] as const,
  },
} as const;
