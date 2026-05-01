import { dehydrate, HydrationBoundary } from "@tanstack/react-query";

import { ListDetailPage } from "@/app/_components/pages/ListDetailPage";
import { ProtectedRoute } from "@/app/_components/common/providers/ProtectedRoute";
import {
  getCachedServerCountryCode,
  getCachedSession,
} from "@/lib/auth/session-server";
import {
  getServerQueryClient,
  prefetchListDetailQueries,
} from "@/lib/api/queries/server";
import {
  DEFAULT_LIST_ITEM_QUERY,
  type FilterField,
  type FilterValue,
  type GroupByField,
  type ListItemQuery,
  type PageSize,
  type RangeFilterField,
  type SortClause,
  type SortField,
} from "@/lib/types/listView";

interface ListPageProps {
  params: Promise<{ id: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default async function ListPage({ params, searchParams }: ListPageProps) {
  const { id } = await params;
  const listId = Number.parseInt(id, 10);

  if (!Number.isFinite(listId) || listId <= 0) {
    return (
      <div className="relative w-full min-h-screen bg-background-logged-in">
        <div className="container mx-auto px-4 mt-8 py-20">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <p className="text-red-400 text-xl mb-4">Invalid list ID</p>
              <p className="text-gray-400">Please provide a valid list ID.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const queryParams = searchParams ? await searchParams : {};
  const query = parseListQuery(queryParams);
  const session = await getCachedSession();
  const country = await getCachedServerCountryCode();
  const qc = getServerQueryClient();

  await prefetchListDetailQueries(qc, session, listId, query, country);

  return (
    <HydrationBoundary state={dehydrate(qc)}>
      <ProtectedRoute>
        <ListDetailPage listId={listId} country={country} />
      </ProtectedRoute>
    </HydrationBoundary>
  );
}

function parseListQuery(
  searchParams: Record<string, string | string[] | undefined>,
): ListItemQuery {
  const filters: Partial<Record<FilterField, FilterValue>> = {};
  const rangeFilters: Partial<Record<RangeFilterField, string | number>> = {};

  Object.entries(searchParams).forEach(([key, rawValue]) => {
    const value = firstValue(rawValue);
    if (!value) return;

    const match = /^filter\[(.+)\]$/.exec(key);
    if (!match) return;

    const field = match[1];
    if (isFilterField(field)) {
      const parts = value.split(",").map((part) => part.trim()).filter(Boolean);
      filters[field] = parts.length > 1 ? parts : parts[0];
    }
    if (isRangeFilterField(field)) {
      rangeFilters[field] = value;
    }
  });

  const groupBy = firstValue(searchParams.group_by);

  return {
    filters,
    rangeFilters,
    sort: parseSort(firstValue(searchParams.sort)),
    groupBy: groupBy && isGroupByField(groupBy) ? groupBy : null,
    page: parsePage(firstValue(searchParams.page)),
    pageSize: parsePageSize(firstValue(searchParams.page_size)),
  };
}

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function parsePage(value?: string) {
  const page = Number(value);
  return Number.isFinite(page) && page >= 1 ? Math.floor(page) : 1;
}

function parsePageSize(value?: string): PageSize {
  const pageSize = Number(value);
  return [10, 20, 50].includes(pageSize)
    ? (pageSize as PageSize)
    : DEFAULT_LIST_ITEM_QUERY.pageSize;
}

function parseSort(value?: string): SortClause[] {
  if (!value) return [];
  return value
    .split(",")
    .map((raw) => raw.trim())
    .filter(Boolean)
    .flatMap((token): SortClause[] => {
      const direction = token.startsWith("-") ? "desc" : "asc";
      const field = token.startsWith("-") ? token.slice(1) : token;
      return isSortField(field) ? [{ field, direction }] : [];
    });
}

function isFilterField(value: string): value is FilterField {
  return ["status", "content_type", "source_api", "added_by"].includes(value);
}

function isRangeFilterField(value: string): value is RangeFilterField {
  return [
    "list_rating_gte",
    "list_rating_lte",
    "added_at_gte",
    "added_at_lte",
    "completed_at_gte",
    "completed_at_lte",
    "release_date_gte",
    "release_date_lte",
  ].includes(value);
}

function isSortField(value: string): value is SortField {
  return [
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
  ].includes(value);
}

function isGroupByField(value: string): value is GroupByField {
  return ["status", "content_type", "source_api", "added_by", "artist"].includes(value);
}
