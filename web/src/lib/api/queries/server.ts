import { QueryClient } from "@tanstack/react-query";

import { getApiUrl, getProxyApiUrl } from "@/lib/env";
import type { SessionSnapshot } from "@/server/session";
import { buildProxyHeaders, getLogicalRequestId } from "@/server/proxy";
import type {
  ContentItem,
  ContentType,
  HomepageResponse,
  ListStatsResponse,
  MultiSearchResponse,
  PaginatedListItemList,
  PaginatedUserListList,
  SearchItem,
  UserListDetail,
} from "@/lib/types";
import { getSourceApi } from "@/lib/utils/contentTypeUtils";
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
  if (!session.isAuthenticated || !session.accessToken) return undefined;

  const listParams = homeListParams(country);
  const requestId = getLogicalRequestId();

  await Promise.allSettled([
    qc.prefetchQuery({
      queryKey: queryKeys.suggestions.byParams({
        limit: SUGGESTIONS_PAGE_SIZE,
        country,
      }),
      queryFn: () =>
        fetchServerSuggestions(
          session.accessToken!,
          country,
          requestId,
        ),
    }),
    qc.prefetchQuery({
      queryKey: queryKeys.lists.list(listParams),
      queryFn: () =>
        fetchServerUserLists(session.accessToken!, listParams, requestId),
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
  const requestId = getLogicalRequestId();

  await qc.prefetchQuery({
    queryKey: queryKeys.search.multi({
      query: trimmedQuery,
      limit: SEARCH_RESULT_LIMIT,
      country,
    }),
    queryFn: () =>
      fetchServerSearch(
        session.accessToken!,
        trimmedQuery,
        country,
        requestId,
      ),
  });
}

export async function prefetchContentDetailQueries(
  qc: QueryClient,
  session: SessionSnapshot,
  contentId: number,
  country: string | null,
) {
  if (!session.isAuthenticated || !session.accessToken) return;
  const requestId = getLogicalRequestId();

  const contentItem = await qc.fetchQuery({
    queryKey: queryKeys.contentDetail.byId(contentId, country ?? undefined),
    queryFn: () =>
      fetchServerContentDetail(
        session.accessToken!,
        contentId,
        country,
        requestId,
      ),
    staleTime: 5 * 60_000,
  });

  if (session.user?.id) {
    qc.setQueryData(
      queryKeys.ratings.byUser(contentItem.id, session.user.id),
      contentItem.current_user_rating,
    );
  }
  return contentItem;
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
  const requestId = getLogicalRequestId();

  await Promise.allSettled([
    qc.prefetchQuery({
      queryKey: queryKeys.lists.detail(listId, LIST_DETAIL_METADATA_PARAMS),
      queryFn: () =>
        fetchServerListMetadata(session.accessToken!, listId, requestId),
    }),
    qc.prefetchQuery({
      queryKey: queryKeys.lists.stats(listId),
      queryFn: () =>
        fetchServerListStats(session.accessToken!, listId, requestId),
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
          requestId,
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

interface OutboundTelemetry {
  requestId: string;
  targetService: "core" | "proxy";
  route: string;
}

async function fetchJson<T>(
  url: string,
  init: RequestInit,
  telemetry: OutboundTelemetry,
) {
  const started = performance.now();
  const response = await fetch(url, { ...init, cache: "no-store" });
  const body = await response.text();
  const durationMs = Math.round((performance.now() - started) * 100) / 100;

  if (typeof window === "undefined") {
    console.log(
      JSON.stringify({
        ts: new Date().toISOString(),
        level: response.ok ? "info" : "warn",
        msg: "outbound_http_request",
        service: "web",
        request_id: telemetry.requestId,
        target_service: telemetry.targetService,
        path: telemetry.route,
        status: response.status,
        duration_ms: durationMs,
        payload_size_bytes: new TextEncoder().encode(body).byteLength,
        cache_status: response.headers.get("x-cache") ?? undefined,
      }),
    );
  }

  if (!response.ok) {
    throw new Error(`Request failed (${response.status})`);
  }

  return JSON.parse(body) as T;
}

function coreHeaders(accessToken: string, requestId: string) {
  return {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
    "X-Request-Id": requestId,
  };
}

async function fetchServerSuggestions(
  accessToken: string,
  country: string | null,
  requestId: string,
) {
  const params = new URLSearchParams({ limit: String(SUGGESTIONS_PAGE_SIZE) });
  const response = await fetchJson<HomepageResponse>(
    `${getProxyApiUrl()}/homepage?${params.toString()}`,
    {
      headers: buildProxyHeaders(country, {
        requestId,
      }),
    },
    {
      requestId,
      targetService: "proxy",
      route: "/v1/proxy/homepage",
    },
  );
  return resolveServerContentIds(accessToken, response, country, requestId);
}

async function fetchServerSearch(
  accessToken: string,
  query: string,
  country: string | null,
  requestId: string,
) {
  const params = new URLSearchParams({
    q: query,
    limit: String(SEARCH_RESULT_LIMIT),
  });
  const response = await fetchJson<MultiSearchResponse>(
    `${getProxyApiUrl()}/search?${params.toString()}`,
    {
      headers: buildProxyHeaders(country, {
        requestId,
      }),
    },
    {
      requestId,
      targetService: "proxy",
      route: "/v1/proxy/search",
    },
  );
  return resolveServerContentIds(accessToken, response, country, requestId);
}

type ResolvableServerContent = SearchItem;

interface BulkResolvedIdentity {
  id: number;
  external_id: string;
  content_type: ContentType;
}

async function resolveServerContentIds<
  T extends HomepageResponse | MultiSearchResponse,
>(
  accessToken: string,
  response: T,
  country: string | null,
  requestId: string,
): Promise<T> {
  const unique = new Map<string, ResolvableServerContent>();
  for (const category of Object.values(response)) {
    for (const item of category.results) {
      unique.set(`${item.type}:${item.id}`, item);
    }
  }
  const items = [...unique.values()];
  if (items.length === 0) return response;

  const params = new URLSearchParams();
  if (country) params.set("country", country);
  const resolved = await fetchJson<{ results: BulkResolvedIdentity[] }>(
    `${getApiUrl()}/content/resolve-ids/${params.size ? `?${params}` : ""}`,
    {
      method: "POST",
      headers: coreHeaders(accessToken, requestId),
      body: JSON.stringify({
        items: items.map((item) => ({
          source_api: getSourceApi(item.type),
          external_id: String(item.id),
          content_type: item.type,
        })),
      }),
    },
    {
      requestId,
      targetService: "core",
      route: "/api/content/resolve-ids/",
    },
  );
  const ids = new Map(
    resolved.results.map((item) => [
      `${item.content_type}:${item.external_id}`,
      item.id,
    ]),
  );

  return Object.fromEntries(
    Object.entries(response).map(([key, rawCategory]) => {
      const category = rawCategory as {
        results: ResolvableServerContent[];
      };
      return [
      key,
      {
        ...category,
        results: category.results.map((item) => ({
          ...item,
          denn_id: ids.get(`${item.type}:${item.id}`),
        })),
      },
      ];
    }),
  ) as unknown as T;
}

async function fetchServerUserLists(
  accessToken: string,
  params: ReturnType<typeof homeListParams>,
  requestId: string,
) {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) searchParams.append(key, String(value));
  });
  return fetchJson<PaginatedUserListList>(
    `${getApiUrl()}/content/lists/?${searchParams.toString()}`,
    { headers: coreHeaders(accessToken, requestId) },
    {
      requestId,
      targetService: "core",
      route: "/api/content/lists/",
    },
  );
}

async function fetchServerContentDetail(
  accessToken: string,
  contentId: number,
  country: string | null,
  requestId: string,
) {
  const params = new URLSearchParams();
  if (country) params.set("country", country);

  return fetchJson<ContentItem>(
    `${getApiUrl()}/content/${contentId}/${params.toString() ? `?${params}` : ""}`,
    { headers: coreHeaders(accessToken, requestId) },
    {
      requestId,
      targetService: "core",
      route: "/api/content/:id/",
    },
  );
}

async function fetchServerListMetadata(
  accessToken: string,
  listId: number,
  requestId: string,
) {
  const params = new URLSearchParams(LIST_DETAIL_METADATA_PARAMS);
  return fetchJson<UserListDetail>(
    `${getApiUrl()}/content/lists/${listId}/?${params.toString()}`,
    { headers: coreHeaders(accessToken, requestId) },
    {
      requestId,
      targetService: "core",
      route: "/api/content/lists/:id/",
    },
  );
}

async function fetchServerListStats(
  accessToken: string,
  listId: number,
  requestId: string,
) {
  return fetchJson<ListStatsResponse>(
    `${getApiUrl()}/content/lists/${listId}/stats/`,
    { headers: coreHeaders(accessToken, requestId) },
    {
      requestId,
      targetService: "core",
      route: "/api/content/lists/:id/stats/",
    },
  );
}

async function fetchServerListItems(
  accessToken: string,
  listId: number,
  page: number,
  pageSize: number,
  options: ReturnType<typeof listItemsOptions>,
  requestId: string,
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
    { headers: coreHeaders(accessToken, requestId) },
    {
      requestId,
      targetService: "core",
      route: "/api/content/lists/:id/items/",
    },
  );
}
