import { QueryClient } from "@tanstack/react-query";
import { createIsomorphicFn } from "@tanstack/react-start";
import { getCookie } from "@tanstack/react-start/server";

import { AUTH_ACCESS_COOKIE } from "@/lib/auth/constants";
import { getApiUrl, getProxyApiUrl } from "@/lib/env";
import type { SessionSnapshot } from "@/server/session";
import { buildProxyHeaders, getLogicalRequestId } from "@/server/proxy";
import {
  ContentType,
  type ContentItem,
  type HomepageResponse,
  type ListStatsResponse,
  type MultiSearchResponse,
  type PaginatedListItemList,
  type PaginatedUserListList,
  type PaginatedProfileResults,
  type ProfileSearchParams,
  type PublicCompletedItem,
  type PublicListSummary,
  type PublicListDetail,
  type PublicProfileOverview,
  type PublicProfileTabData,
  type PublicRatingItem,
  type SearchItem,
  type UserListDetail,
} from "@/lib/types";
import {
  getSourceApi,
  normalizeContentType,
} from "@/lib/utils/contentTypeUtils";
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

const CONTENT_DETAIL_REQUEST_TIMEOUT_MS = 5_000;

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
  const accessToken = getServerAccessToken(session);
  if (!accessToken) return undefined;

  const listParams = homeListParams(country);
  const requestId = getLogicalRequestId();

  await Promise.allSettled([
    qc.prefetchQuery({
      queryKey: queryKeys.suggestions.byParams({
        limit: SUGGESTIONS_PAGE_SIZE,
        country,
      }),
      queryFn: () =>
        fetchServerSuggestions(accessToken, country, requestId),
    }),
    qc.prefetchQuery({
      queryKey: queryKeys.lists.list(listParams),
      queryFn: () =>
        fetchServerUserLists(accessToken, listParams, requestId),
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
  const accessToken = getServerAccessToken(session);
  if (!accessToken || !trimmedQuery) return;
  const requestId = getLogicalRequestId();
  const allowAdult = session.user?.allow_adult_content ?? false;

  await qc.prefetchQuery({
    queryKey: queryKeys.search.multi({
      query: trimmedQuery,
      limit: SEARCH_RESULT_LIMIT,
      country,
      allowAdult,
    }),
    queryFn: () =>
      fetchServerSearch(
        accessToken,
        trimmedQuery,
        country,
        requestId,
        allowAdult,
      ),
  });
}

export async function prefetchContentDetailQueries(
  qc: QueryClient,
  session: SessionSnapshot,
  contentId: number,
  country: string | null,
) {
  const accessToken = getServerAccessToken(session);
  const requestId = getLogicalRequestId();
  const viewerId = session.user?.id ?? "anonymous";

  const contentItem = await qc.fetchQuery({
    queryKey: queryKeys.contentDetail.byId(
      contentId,
      viewerId,
      country ?? undefined,
    ),
    queryFn: () =>
      fetchServerContentDetail(
        accessToken,
        contentId,
        country,
        requestId,
      ),
    retry: false,
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

export async function prefetchPublicProfileQueries(
  qc: QueryClient,
  session: SessionSnapshot,
  username: string,
  search: ProfileSearchParams,
) {
  const accessToken = getServerAccessToken(session);
  const requestId = getLogicalRequestId();
  const encodedUsername = encodeURIComponent(username);

  const overviewPromise = qc.ensureQueryData({
    queryKey: queryKeys.profiles.overview(username),
    queryFn: () =>
      fetchServerCore<PublicProfileOverview>(
        accessToken,
        `/profiles/${encodedUsername}/`,
        requestId,
        "/api/profiles/:username/",
      ),
    staleTime: 60_000,
  });
  const activeTabPromise = ensureServerProfileTab(
    qc,
    accessToken,
    username,
    encodedUsername,
    search,
    requestId,
  );

  const [overview, activeTab] = await Promise.all([
    overviewPromise,
    activeTabPromise,
  ]);
  return { overview, activeTab };
}

async function ensureServerProfileTab(
  qc: QueryClient,
  accessToken: string | null,
  username: string,
  encodedUsername: string,
  search: ProfileSearchParams,
  requestId: string,
): Promise<PublicProfileTabData | null> {
  if (search.tab === "overview") return null;

  const params = buildProfileSearchParams(search);
  const query = params.size > 0 ? `?${params.toString()}` : "";
  const path = `/profiles/${encodedUsername}/${search.tab}/${query}`;

  if (search.tab === "completed") {
    const data = await qc.ensureQueryData({
      queryKey: queryKeys.profiles.tab(username, search.tab, search),
      queryFn: () =>
        fetchServerCore<PaginatedProfileResults<PublicCompletedItem>>(
          accessToken,
          path,
          requestId,
          "/api/profiles/:username/completed/",
        ),
      staleTime: 60_000,
    });
    return { tab: search.tab, data };
  }
  if (search.tab === "ratings") {
    const data = await qc.ensureQueryData({
      queryKey: queryKeys.profiles.tab(username, search.tab, search),
      queryFn: () =>
        fetchServerCore<PaginatedProfileResults<PublicRatingItem>>(
          accessToken,
          path,
          requestId,
          "/api/profiles/:username/ratings/",
        ),
      staleTime: 60_000,
    });
    return { tab: search.tab, data };
  }

  const data = await qc.ensureQueryData({
    queryKey: queryKeys.profiles.tab(username, search.tab, search),
    queryFn: () =>
      fetchServerCore<PaginatedProfileResults<PublicListSummary>>(
        accessToken,
        path,
        requestId,
        "/api/profiles/:username/lists/",
      ),
    staleTime: 60_000,
  });
  return { tab: search.tab, data };
}

export async function prefetchPublicListQuery(
  qc: QueryClient,
  session: SessionSnapshot,
  listId: number,
) {
  const accessToken = getServerAccessToken(session);
  const requestId = getLogicalRequestId();
  return qc.fetchQuery({
    queryKey: queryKeys.lists.publicDetail(listId),
    queryFn: () =>
      fetchServerCore<PublicListDetail | UserListDetail>(
        accessToken,
        `/content/lists/${listId}/`,
        requestId,
        "/api/content/lists/:id/",
      ),
    staleTime: 30_000,
  });
}

export async function prefetchListDetailQueries(
  qc: QueryClient,
  session: SessionSnapshot,
  listId: number,
  query: ListItemQuery,
  country: string | null,
) {
  const accessToken = getServerAccessToken(session);
  if (!accessToken) return;

  const options = listItemsOptions(query, country);
  const requestId = getLogicalRequestId();

  await Promise.allSettled([
    qc.prefetchQuery({
      queryKey: queryKeys.lists.detail(listId, LIST_DETAIL_METADATA_PARAMS),
      queryFn: () =>
        fetchServerListMetadata(accessToken, listId, requestId),
    }),
    qc.prefetchQuery({
      queryKey: queryKeys.lists.stats(listId),
      queryFn: () =>
        fetchServerListStats(accessToken, listId, requestId),
    }),
    qc.prefetchQuery({
      queryKey: queryKeys.listItems.page(listId, {
        page: query.page,
        pageSize: query.pageSize,
        options,
      }),
      queryFn: () =>
        fetchServerListItems(
          accessToken,
          listId,
          query.page,
          query.pageSize,
          options,
          requestId,
        ),
    }),
  ]);
}

function getServerAccessToken(session: SessionSnapshot) {
  if (!session.isAuthenticated) return null;
  return readAccessToken();
}

const readAccessToken = createIsomorphicFn()
  .server(() => getCookie(AUTH_ACCESS_COOKIE) ?? null)
  .client(() => null);

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

function coreHeaders(accessToken: string | null, requestId: string) {
  return {
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
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
  allowAdult: boolean,
) {
  const params = new URLSearchParams({
    q: query,
    limit: String(SEARCH_RESULT_LIMIT),
    adult: allowAdult ? "include" : "exclude",
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
  const unique = new Map<
    string,
    { item: ResolvableServerContent; contentType: ContentType }
  >();
  for (const category of Object.values(response)) {
    for (const item of category.results) {
      const contentType = normalizeContentType(item.type);
      if (!contentType || contentType === ContentType.PERSON) continue;
      unique.set(`${contentType}:${item.id}`, { item, contentType });
    }
  }
  const items = [...unique.values()];
  if (items.length === 0) return response;

  const params = new URLSearchParams();
  if (country) params.set("country", country);
  const resolved = await fetchJson<{ results: BulkResolvedIdentity[] }>(
    coreRequestUrl(`/content/resolve-ids/${params.size ? `?${params}` : ""}`),
    {
      method: "POST",
      headers: coreHeaders(accessToken, requestId),
      body: JSON.stringify({
        items: items.map(({ item, contentType }) => ({
          source_api: getSourceApi(contentType),
          external_id: String(item.id),
          content_type: contentType,
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
        results: category.results.map((item) => {
          const contentType = normalizeContentType(item.type);
          return {
            ...item,
            denn_id: contentType
              ? ids.get(`${contentType}:${item.id}`)
              : undefined,
          };
        }),
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
    coreRequestUrl(`/content/lists/?${searchParams.toString()}`),
    { headers: coreHeaders(accessToken, requestId) },
    {
      requestId,
      targetService: "core",
      route: "/api/content/lists/",
    },
  );
}

async function fetchServerContentDetail(
  accessToken: string | null,
  contentId: number,
  country: string | null,
  requestId: string,
) {
  const params = new URLSearchParams();
  if (country) params.set("country", country);

  return fetchJson<ContentItem>(
    coreRequestUrl(
      `/content/${contentId}/${params.toString() ? `?${params}` : ""}`,
    ),
    {
      headers: coreHeaders(accessToken, requestId),
      signal: AbortSignal.timeout(CONTENT_DETAIL_REQUEST_TIMEOUT_MS),
    },
    {
      requestId,
      targetService: "core",
      route: "/api/content/:id/",
    },
  );
}

function buildProfileSearchParams(search: ProfileSearchParams) {
  const params = new URLSearchParams();
  Object.entries(search).forEach(([key, value]) => {
    if (key !== "tab" && value !== undefined && value !== "") {
      params.set(key, String(value));
    }
  });
  return params;
}

function fetchServerCore<T>(
  accessToken: string | null,
  path: string,
  requestId: string,
  route: string,
) {
  return fetchJson<T>(
    coreRequestUrl(path),
    { headers: coreHeaders(accessToken, requestId) },
    {
      requestId,
      targetService: "core",
      route,
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
    coreRequestUrl(`/content/lists/${listId}/?${params.toString()}`),
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
    coreRequestUrl(`/content/lists/${listId}/stats/`),
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
    coreRequestUrl(
      `/content/lists/${listId}/items/?${params.toString()}`,
    ),
    { headers: coreHeaders(accessToken, requestId) },
    {
      requestId,
      targetService: "core",
      route: "/api/content/lists/:id/items/",
    },
  );
}

function coreRequestUrl(path: string) {
  if (typeof window !== "undefined") {
    return `/api/core${path}`;
  }
  return `${getApiUrl()}${path}`;
}
