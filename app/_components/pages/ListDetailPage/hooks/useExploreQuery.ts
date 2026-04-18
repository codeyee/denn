"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import {
  DEFAULT_LIST_ITEM_QUERY,
  FilterField,
  FilterValue,
  GroupByField,
  ListItemQuery,
  PageSize,
  RangeFilterField,
  SortClause,
  SortField,
} from "@/lib/types/listView";

/**
 * URL-driven exploration query for the list detail page (Sprint 4.5C).
 *
 * - URL querystring is the source of truth: refresh-safe, shareable, and
 *   back/forward keeps view state.
 * - localStorage acts only as a seed: the FIRST time a list is opened
 *   without query params we populate the URL from the stored preferences.
 *   Once the user changes anything we keep writing both URL and storage.
 *
 * The serialized format mirrors the backend convention:
 *   filter[<field>]=value     (csv allowed)
 *   sort=field,-other         (csv, prefix `-` for desc)
 *   group_by=<field>
 *   page=<n>
 *   page_size=<n>
 */

const ALLOWED_FILTERS: ReadonlySet<string> = new Set<FilterField>([
  "status",
  "content_type",
  "source_api",
  "added_by",
]);

const ALLOWED_RANGE_FILTERS: ReadonlySet<string> = new Set<RangeFilterField>([
  "list_rating_gte",
  "list_rating_lte",
  "added_at_gte",
  "added_at_lte",
  "completed_at_gte",
  "completed_at_lte",
  "release_date_gte",
  "release_date_lte",
]);

const ALLOWED_SORTS: ReadonlySet<string> = new Set<SortField>([
  "list_order",
  "added_at",
  "completed_at",
  "status",
  "content_type",
  "list_rating",
  "display_title",
  "artist",
  "album_title",
  "release_date",
]);

const ALLOWED_GROUPS: ReadonlySet<string> = new Set<GroupByField>([
  "status",
  "content_type",
  "source_api",
  "added_by",
  "artist",
]);

const VALID_PAGE_SIZES: ReadonlyArray<PageSize> = [10, 20, 50];

function storageKey(listId: number): string {
  return `list-explore-query-${listId}`;
}

function loadFromStorage(listId: number): Partial<ListItemQuery> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(storageKey(listId));
    return raw ? (JSON.parse(raw) as Partial<ListItemQuery>) : null;
  } catch {
    return null;
  }
}

function saveToStorage(listId: number, query: ListItemQuery): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(storageKey(listId), JSON.stringify(query));
  } catch {
    // Storage may be full or disabled — non-fatal.
  }
}

function parseSort(raw: string | null): SortClause[] {
  if (!raw) return [];
  const out: SortClause[] = [];
  for (const tokenRaw of raw.split(",")) {
    const token = tokenRaw.trim();
    if (!token) continue;
    let direction: "asc" | "desc" = "asc";
    let field = token;
    if (token.startsWith("-")) {
      direction = "desc";
      field = token.slice(1);
    }
    if (ALLOWED_SORTS.has(field)) {
      out.push({ field: field as SortField, direction });
    }
  }
  return out;
}

function parsePageSize(raw: string | null): PageSize {
  const n = Number(raw);
  if (VALID_PAGE_SIZES.includes(n as PageSize)) return n as PageSize;
  return DEFAULT_LIST_ITEM_QUERY.pageSize;
}

function parsePage(raw: string | null): number {
  const n = Number(raw);
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1;
}

function parseQueryFromParams(params: URLSearchParams): ListItemQuery {
  const filters: Partial<Record<FilterField, FilterValue>> = {};
  const rangeFilters: Partial<Record<RangeFilterField, string | number>> = {};

  params.forEach((value, key) => {
    const m = /^filter\[(.+)\]$/.exec(key);
    if (!m) return;
    const field = m[1];
    if (!value) return;
    if (ALLOWED_FILTERS.has(field)) {
      const parts = value
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean);
      filters[field as FilterField] = parts.length > 1 ? parts : parts[0];
    } else if (ALLOWED_RANGE_FILTERS.has(field)) {
      rangeFilters[field as RangeFilterField] = value;
    }
  });

  const groupRaw = params.get("group_by");
  const groupBy = groupRaw && ALLOWED_GROUPS.has(groupRaw)
    ? (groupRaw as GroupByField)
    : null;

  return {
    filters,
    rangeFilters,
    sort: parseSort(params.get("sort")),
    groupBy,
    page: parsePage(params.get("page")),
    pageSize: parsePageSize(params.get("page_size")),
  };
}

function serializeQueryToParams(query: ListItemQuery): URLSearchParams {
  const params = new URLSearchParams();

  for (const [field, value] of Object.entries(query.filters)) {
    if (value === undefined || value === null || value === "") continue;
    const serialized = Array.isArray(value)
      ? value.map(String).join(",")
      : String(value);
    if (serialized) params.set(`filter[${field}]`, serialized);
  }

  for (const [field, value] of Object.entries(query.rangeFilters)) {
    if (value === undefined || value === null || value === "") continue;
    params.set(`filter[${field}]`, String(value));
  }

  if (query.sort.length > 0) {
    params.set(
      "sort",
      query.sort
        .map((c) => (c.direction === "desc" ? `-${c.field}` : c.field))
        .join(","),
    );
  }
  if (query.groupBy) params.set("group_by", query.groupBy);
  if (query.page > 1) params.set("page", String(query.page));
  if (query.pageSize !== DEFAULT_LIST_ITEM_QUERY.pageSize) {
    params.set("page_size", String(query.pageSize));
  }

  return params;
}

function hasAnyExploreParam(params: URLSearchParams): boolean {
  for (const key of params.keys()) {
    if (
      key === "sort" ||
      key === "group_by" ||
      key === "page" ||
      key === "page_size" ||
      key.startsWith("filter[")
    ) {
      return true;
    }
  }
  return false;
}

export interface UseExploreQueryReturn {
  query: ListItemQuery;
  setQuery: (next: ListItemQuery) => void;
  patchQuery: (patch: Partial<ListItemQuery>) => void;
  setPage: (page: number) => void;
  setPageSize: (pageSize: PageSize) => void;
  setSort: (sort: SortClause[]) => void;
  setGroupBy: (groupBy: GroupByField | null) => void;
  setFilter: (field: FilterField, value: FilterValue | null | undefined) => void;
  resetExploration: () => void;
}

export function useExploreQuery(listId: number): UseExploreQueryReturn {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const seededRef = useRef(false);

  const query = useMemo<ListItemQuery>(() => {
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    return parseQueryFromParams(params);
  }, [searchParams]);

  // One-shot seed from localStorage when no URL params are present.
  useEffect(() => {
    if (seededRef.current) return;
    seededRef.current = true;

    const params = new URLSearchParams(searchParams?.toString() ?? "");
    if (hasAnyExploreParam(params)) return;

    const seed = loadFromStorage(listId);
    if (!seed) return;

    const merged: ListItemQuery = { ...DEFAULT_LIST_ITEM_QUERY, ...seed };
    const next = serializeQueryToParams(merged).toString();
    if (!next) return;
    router.replace(`${pathname}?${next}`, { scroll: false });
    // We deliberately do NOT depend on every param: this should run once per list.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listId]);

  // Persist whatever ends up in the URL to localStorage.
  useEffect(() => {
    saveToStorage(listId, query);
  }, [listId, query]);

  const writeQuery = useCallback(
    (next: ListItemQuery) => {
      const params = serializeQueryToParams(next);
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router],
  );

  const setQuery = useCallback(
    (next: ListItemQuery) => writeQuery(next),
    [writeQuery],
  );

  const patchQuery = useCallback(
    (patch: Partial<ListItemQuery>) => writeQuery({ ...query, ...patch }),
    [query, writeQuery],
  );

  const setPage = useCallback(
    (page: number) => writeQuery({ ...query, page: Math.max(1, page) }),
    [query, writeQuery],
  );

  const setPageSize = useCallback(
    (pageSize: PageSize) => writeQuery({ ...query, pageSize, page: 1 }),
    [query, writeQuery],
  );

  const setSort = useCallback(
    (sort: SortClause[]) => writeQuery({ ...query, sort, page: 1 }),
    [query, writeQuery],
  );

  const setGroupBy = useCallback(
    (groupBy: GroupByField | null) =>
      writeQuery({ ...query, groupBy, page: 1 }),
    [query, writeQuery],
  );

  const setFilter = useCallback(
    (field: FilterField, value: FilterValue | null | undefined) => {
      const nextFilters = { ...query.filters };
      if (
        value === null ||
        value === undefined ||
        value === "" ||
        (Array.isArray(value) && value.length === 0)
      ) {
        delete nextFilters[field];
      } else {
        nextFilters[field] = value;
      }
      writeQuery({ ...query, filters: nextFilters, page: 1 });
    },
    [query, writeQuery],
  );

  const resetExploration = useCallback(() => {
    writeQuery({
      ...DEFAULT_LIST_ITEM_QUERY,
      pageSize: query.pageSize,
    });
  }, [query.pageSize, writeQuery]);

  return {
    query,
    setQuery,
    patchQuery,
    setPage,
    setPageSize,
    setSort,
    setGroupBy,
    setFilter,
    resetExploration,
  };
}
