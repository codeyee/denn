import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { ListDetailPage } from "@/components/pages/ListDetailPage";
import { ProtectedRoute } from "@/components/common/providers/ProtectedRoute";
import { PublicListPage } from "@/components/pages/PublicListPage";
import {
  prefetchListDetailQueries,
  prefetchPublicListQuery,
} from "@/lib/api/queries/server";
import type { PublicListDetail } from "@/lib/types";
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

const listSearchSchema = z
  .object({
    sort: z.string().optional(),
    group_by: z.string().optional(),
    page: z.string().optional(),
    page_size: z.string().optional(),
  })
  .catchall(z.string().optional())
  .catch({});

type ListSearch = z.infer<typeof listSearchSchema>;

export const Route = createFileRoute("/lists/$id")({
  validateSearch: listSearchSchema,
  loaderDeps: ({ search }) => ({ query: parseListQuery(search) }),
  loader: async ({ context, params, deps }) => {
    const listId = Number.parseInt(params.id, 10);
    if (!Number.isFinite(listId) || listId <= 0) {
      return { invalid: true as const };
    }

    const list = await prefetchPublicListQuery(
      context.queryClient,
      context.session,
      listId,
    );
    const isPublicReadOnly = "collaborators" in list;
    if (!isPublicReadOnly) {
      await prefetchListDetailQueries(
        context.queryClient,
        context.session,
        listId,
        deps.query,
        context.country,
      );
    }

    return {
      invalid: false as const,
      listId,
      country: context.country,
      publicList: isPublicReadOnly ? list : null,
    };
  },
  component: ListDetailRoute,
});

function ListDetailRoute() {
  const data = Route.useLoaderData();

  if (data.invalid) {
    return (
      <main id="main-content" tabIndex={-1} className="relative min-h-screen w-full bg-background-logged-in">
        <div className="container mx-auto px-4 mt-8 py-20">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <h1 className="text-red-400 text-xl mb-4">Invalid list ID</h1>
              <p className="text-gray-400">Please provide a valid list ID.</p>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (data.publicList) {
    return <PublicListPage list={data.publicList as PublicListDetail} />;
  }

  return (
    <ProtectedRoute>
      <ListDetailPage listId={data.listId} country={data.country} />
    </ProtectedRoute>
  );
}

function parseListQuery(search: ListSearch): ListItemQuery {
  const filters: Partial<Record<FilterField, FilterValue>> = {};
  const rangeFilters: Partial<Record<RangeFilterField, string | number>> = {};

  for (const [key, rawValue] of Object.entries(search)) {
    if (typeof rawValue !== "string" || !rawValue) continue;

    const match = /^filter\[(.+)\]$/.exec(key);
    if (!match) continue;

    const field = match[1];
    if (isFilterField(field)) {
      const parts = rawValue
        .split(",")
        .map((part) => part.trim())
        .filter(Boolean);
      filters[field] = parts.length > 1 ? parts : parts[0];
    }
    if (isRangeFilterField(field)) {
      rangeFilters[field] = rawValue;
    }
  }

  const groupBy = search.group_by;

  return {
    filters,
    rangeFilters,
    sort: parseSort(search.sort),
    groupBy: groupBy && isGroupByField(groupBy) ? groupBy : null,
    page: parsePage(search.page),
    pageSize: parsePageSize(search.page_size),
  };
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
  return ["context_status", "content_type", "source_api", "added_by"].includes(value);
}

function isRangeFilterField(value: string): value is RangeFilterField {
  return [
    "list_rating_gte",
    "list_rating_lte",
    "added_at_gte",
    "added_at_lte",
    "context_completed_at_gte",
    "context_completed_at_lte",
    "release_date_gte",
    "release_date_lte",
  ].includes(value);
}

function isSortField(value: string): value is SortField {
  return [
    "list_order",
    "added_at",
    "context_completed_at",
    "context_status",
    "content_type",
    "list_rating",
    "display_title",
    "artist",
    "album_title",
    "release_date",
  ].includes(value);
}

function isGroupByField(value: string): value is GroupByField {
  return ["context_status", "content_type", "source_api", "added_by", "artist"].includes(value);
}
