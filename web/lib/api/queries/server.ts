import "server-only";

import { QueryClient } from "@tanstack/react-query";
import { headers } from "next/headers";

import { getApiUrl, getProxyApiUrl } from "@/lib/env";
import type { SessionSnapshot } from "@/lib/auth/session-server";
import { buildProxyHeaders, generateRequestId } from "@/lib/server/proxy";
import type {
  ContentItem,
  HomepageResponse,
  ListStatsResponse,
  PaginatedListItemList,
  PaginatedRatingList,
  PaginatedUserListList,
  UserListDetail,
} from "@/lib/types";
import type { ListItemQuery } from "@/lib/types/listView";
import {
  HOME_LIST_FIELDS,
  HOME_LIST_IMAGES_SIZE,
  HOME_LIST_ITEMS_SIZE,
  HOME_LIST_SOURCE_FIELDS,
  LIST_DETAIL_METADATA_PARAMS,
  LIST_VIEWER_SOURCE_FIELDS,
  SEARCH_RESULT_LIMIT,
  SUGGESTIONS_PAGE_SIZE,
} from "./constants";
import { queryKeys } from "./keys";

export function getServerQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        gcTime: 5 * 60_000,
        retry: 1,
      },
    },
  });
}

export async function prefetchHomeQueries(
  qc: QueryClient,
  session: SessionSnapshot,
  country: string | null,
) {
  if (!session.isAuthenticated || !session.accessToken) return;

  const listParams = homeListParams(country);

  await Promise.allSettled([
    qc.prefetchQuery({
      queryKey: queryKeys.suggestions.byParams({
        limit: SUGGESTIONS_PAGE_SIZE,
        country,
      }),
      queryFn: () => fetchServerSuggestions(country),
    }),
    qc.prefetchQuery({
      queryKey: queryKeys.lists.list(listParams),
      queryFn: () => fetchServerUserLists(session.accessToken!, listParams),
    }),
  ]);
}

export async function prefetchSearchQuery(
  qc: QueryClient,
  session: SessionSnapshot,
  query: string,
  country: string | null,
) {
  const trimmedQuery = query.trim();
  if (!session.isAuthenticated || !trimmedQuery) return;

  await qc.prefetchQuery({
    queryKey: queryKeys.search.multi({
      query: trimmedQuery,
      limit: SEARCH_RESULT_LIMIT,
      country,
    }),
    queryFn: () => fetchServerSearch(trimmedQuery, country),
  });
}

export async function prefetchContentDetailQueries(
  qc: QueryClient,
  session: SessionSnapshot,
  contentId: number,
  country: string | null,
) {
  if (!session.isAuthenticated || !session.accessToken) return;

  const contentItem = await qc.fetchQuery({
    queryKey: queryKeys.contentDetail.byId(contentId, country ?? undefined),
    queryFn: () =>
      fetchServerContentDetail(session.accessToken!, contentId, country),
    staleTime: 5 * 60_000,
  });

  if (session.user?.id) {
    await qc.prefetchQuery({
      queryKey: queryKeys.ratings.byUser(contentItem.id, session.user.id),
      queryFn: () =>
        fetchServerUserRating(
          session.accessToken!,
          contentItem.id,
          session.user!.id,
        ),
    });
  }
}

export async function prefetchListDetailQueries(
  qc: QueryClient,
  session: SessionSnapshot,
  listId: number,
  query: ListItemQuery,
  country: string | null,
) {
  if (!session.isAuthenticated || !session.accessToken) return;

  const options = listItemsOptions(query, country);

  await Promise.allSettled([
    qc.prefetchQuery({
      queryKey: queryKeys.lists.detail(listId, LIST_DETAIL_METADATA_PARAMS),
      queryFn: () =>
        fetchServerListMetadata(session.accessToken!, listId),
    }),
    qc.prefetchQuery({
      queryKey: queryKeys.lists.stats(listId),
      queryFn: () => fetchServerListStats(session.accessToken!, listId),
    }),
    qc.prefetchQuery({
      queryKey: queryKeys.listItems.page(listId, {
        page: query.page,
        pageSize: query.pageSize,
        options,
      }),
      queryFn: () =>
        fetchServerListItems(
          session.accessToken!,
          listId,
          query.page,
          query.pageSize,
          options,
        ),
    }),
  ]);
}

export function homeListParams(country: string | null) {
  return {
    items_size: HOME_LIST_ITEMS_SIZE,
    images_size: HOME_LIST_IMAGES_SIZE,
    fields: HOME_LIST_FIELDS,
    source_fields: HOME_LIST_SOURCE_FIELDS,
    country: country ?? undefined,
  };
}

export function listItemsOptions(
  query: ListItemQuery,
  country: string | null,
) {
  return {
    country: country ?? undefined,
    expand: "content_item",
    source_fields: LIST_VIEWER_SOURCE_FIELDS,
    query: {
      filters: query.filters,
      rangeFilters: query.rangeFilters,
      sort: query.sort,
      groupBy: query.groupBy,
    },
  };
}

async function inboundRequestId() {
  try {
    const h = await headers();
    return h.get("x-request-id") ?? generateRequestId();
  } catch {
    return generateRequestId();
  }
}

async function fetchJson<T>(url: string, init: RequestInit) {
  const response = await fetch(url, { ...init, cache: "no-store" });

  if (!response.ok) {
    throw new Error(`Request failed (${response.status})`);
  }

  return response.json() as Promise<T>;
}

async function coreHeaders(accessToken: string) {
  return {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
    "X-Request-Id": await inboundRequestId(),
  };
}

async function fetchServerSuggestions(country: string | null) {
  const params = new URLSearchParams({ limit: String(SUGGESTIONS_PAGE_SIZE) });
  return fetchJson<HomepageResponse>(
    `${getProxyApiUrl()}/homepage?${params.toString()}`,
    {
      headers: buildProxyHeaders(country, {
        requestId: await inboundRequestId(),
      }),
    },
  );
}

async function fetchServerSearch(query: string, country: string | null) {
  const params = new URLSearchParams({
    q: query,
    limit: String(SEARCH_RESULT_LIMIT),
  });
  return fetchJson(`${getProxyApiUrl()}/search?${params.toString()}`, {
    headers: buildProxyHeaders(country, {
      requestId: await inboundRequestId(),
    }),
  });
}

async function fetchServerUserLists(
  accessToken: string,
  params: ReturnType<typeof homeListParams>,
) {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) searchParams.append(key, String(value));
  });
  return fetchJson<PaginatedUserListList>(
    `${getApiUrl()}/content/lists/?${searchParams.toString()}`,
    { headers: await coreHeaders(accessToken) },
  );
}

async function fetchServerContentDetail(
  accessToken: string,
  contentId: number,
  country: string | null,
) {
  const params = new URLSearchParams();
  if (country) params.set("country", country);

  return fetchJson<ContentItem>(
    `${getApiUrl()}/content/${contentId}/${params.toString() ? `?${params}` : ""}`,
    { headers: await coreHeaders(accessToken) },
  );
}

async function fetchServerUserRating(
  accessToken: string,
  contentItemId: number,
  userId: number,
) {
  const params = new URLSearchParams({
    content_item_id: String(contentItemId),
    user_id: String(userId),
    page_size: "1",
  });
  const response = await fetchJson<PaginatedRatingList>(
    `${getApiUrl()}/content/ratings/?${params.toString()}`,
    { headers: await coreHeaders(accessToken) },
  );
  return response.results[0] ?? null;
}

async function fetchServerListMetadata(accessToken: string, listId: number) {
  const params = new URLSearchParams(LIST_DETAIL_METADATA_PARAMS);
  return fetchJson<UserListDetail>(
    `${getApiUrl()}/content/lists/${listId}/?${params.toString()}`,
    { headers: await coreHeaders(accessToken) },
  );
}

async function fetchServerListStats(accessToken: string, listId: number) {
  return fetchJson<ListStatsResponse>(
    `${getApiUrl()}/content/lists/${listId}/stats/`,
    { headers: await coreHeaders(accessToken) },
  );
}

async function fetchServerListItems(
  accessToken: string,
  listId: number,
  page: number,
  pageSize: number,
  options: ReturnType<typeof listItemsOptions>,
) {
  const params = new URLSearchParams({
    page: String(page),
    page_size: String(pageSize),
    expand: options.expand,
    source_fields: options.source_fields,
  });
  if (options.country) params.set("country", options.country);

  for (const [field, value] of Object.entries(options.query.filters ?? {})) {
    if (value === undefined || value === null || value === "") continue;
    params.set(
      `filter[${field}]`,
      Array.isArray(value) ? value.map(String).join(",") : String(value),
    );
  }
  for (const [field, value] of Object.entries(options.query.rangeFilters ?? {})) {
    if (value === undefined || value === null || value === "") continue;
    params.set(`filter[${field}]`, String(value));
  }
  if (options.query.sort.length > 0) {
    params.set(
      "sort",
      options.query.sort
        .map((sort) =>
          sort.direction === "desc" ? `-${sort.field}` : sort.field,
        )
        .join(","),
    );
  }
  if (options.query.groupBy) params.set("group_by", options.query.groupBy);

  return fetchJson<PaginatedListItemList>(
    `${getApiUrl()}/content/lists/${listId}/items/?${params.toString()}`,
    { headers: await coreHeaders(accessToken) },
  );
}
