import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import { Buffer } from "node:buffer";
import process from "node:process";
import { setTimeout as delay } from "node:timers/promises";
import { URL } from "node:url";

const corePort = Number.parseInt(process.env.E2E_FIXTURE_CORE_PORT ?? "18000", 10);
const proxyPort = Number.parseInt(process.env.E2E_FIXTURE_PROXY_PORT ?? "18080", 10);
const appPort = Number.parseInt(process.env.E2E_APP_PORT ?? "4173", 10);
const user = {
  id: 1,
  username: "phase0-fixture",
  email: "phase0@example.test",
  first_name: "Phase",
  last_name: "Zero",
  allow_adult_content: false,
};
const now = "2026-07-23T12:00:00Z";
const movie = {
  id: "101",
  type: "movie",
  title: "Phase Zero Movie",
  original_title: "Phase Zero Movie",
  description:
    "Deterministic metadata for browser guardrails. Additional copy verifies that the featured description remains concise and never covers the full artwork on narrow mobile screens.",
  image_url: `${fixtureOrigin()}/__fixture__/images/poster-1.svg`,
  tagline: null,
  imdb_id: null,
  release_date: "2024-01-01",
  duration_minutes: 120,
  status: "Released",
  authors: [
    { name: "Fixture Studio One", type: "STUDIO" },
    { name: "Fixture Studio Two", type: "STUDIO" },
    { name: "Fixture Studio Three", type: "STUDIO" },
  ],
  images: [
    {
      type: "GALLERY",
      size: "ORIGINAL",
      image_url: `${fixtureOrigin()}/__fixture__/images/banner-1.svg`,
    },
    {
      type: "POSTER",
      size: "STANDARD",
      image_url: `${fixtureOrigin()}/__fixture__/images/poster-1.svg`,
    },
  ],
  platforms: null,
};
const movieTwo = {
  ...movie,
  id: "102",
  title: "Phase Two Movie",
  original_title: "Phase Two Movie",
  image_url: `${fixtureOrigin()}/__fixture__/images/poster-2.svg`,
  images: [
    {
      type: "GALLERY",
      size: "ORIGINAL",
      image_url: `${fixtureOrigin()}/__fixture__/images/banner-2.svg`,
    },
    {
      type: "POSTER",
      size: "STANDARD",
      image_url: `${fixtureOrigin()}/__fixture__/images/poster-2.svg`,
    },
  ],
};
const movieThree = {
  ...movie,
  id: "103",
  title: "Phase Three Movie",
  original_title: "Phase Three Movie",
  image_url: `${fixtureOrigin()}/__fixture__/images/poster-3.svg`,
  images: [
    {
      type: "GALLERY",
      size: "ORIGINAL",
      image_url: `${fixtureOrigin()}/__fixture__/images/banner-3.svg`,
    },
    {
      type: "POSTER",
      size: "STANDARD",
      image_url: `${fixtureOrigin()}/__fixture__/images/poster-3.svg`,
    },
  ],
};
const contentItem = {
  id: 1,
  source_api: "tmdb",
  external_id: "101",
  content_type: "MOVIE",
  rating_count: 0,
  average_rating: null,
  current_user_rating: null,
  created_at: now,
  source_data: movie,
};
const noArtworkContentItem = {
  ...contentItem,
  id: 2,
  external_id: "104",
  source_data: {
    ...movie,
    id: "104",
    title: "No Artwork Movie",
    original_title: "No Artwork Movie",
    image_url: null,
    images: [],
  },
};
const list = {
  id: 1,
  name: "Phase 0 Fixture List",
  description: "Stable list data for browser smoke tests.",
  list_type: "PERSONAL",
  owner: user,
  members: [],
  item_count: "0",
  created_at: now,
  updated_at: now,
};
const listTwo = {
  ...list,
  id: 2,
  name: "Phase 0 Shared List",
  list_type: "SHARED",
};
const proxyMetadata = { page: 1, total_results: 3, total_pages: 1 };
const emptyProxyCategory = {
  metadata: { page: 1, total_results: 0, total_pages: 0 },
  results: [],
  error: "",
};
const homepage = {
  movies: {
    metadata: { page: 1, total_results: 3, total_pages: 1 },
    results: [movie, movieTwo, movieThree],
    error: "",
  },
  "tv-shows": emptyProxyCategory,
  games: emptyProxyCategory,
  albums: emptyProxyCategory,
  books: emptyProxyCategory,
};
const search = {
  movies: {
    metadata: proxyMetadata,
    results: [movie, movieTwo, movieThree].map((item) => ({
        id: item.id,
        type: item.type,
        title: item.title,
        original_title: item.original_title,
        description: item.description,
        image_url: null,
        release_date: item.release_date,
        authors: item.authors,
      })),
    error: null,
  },
  "tv-shows": { ...emptyProxyCategory, error: null },
  games: { ...emptyProxyCategory, error: null },
  albums: { ...emptyProxyCategory, error: null },
  books: { ...emptyProxyCategory, error: null },
};
const adultSearch = {
  ...search,
  movies: {
    metadata: { page: 1, total_results: 2, total_pages: 1 },
    results: [
      ...search.movies.results,
      {
        ...search.movies.results[0],
        id: "199",
        title: "Explicit Opt-In Result",
        original_title: "Explicit Opt-In Result",
      },
    ],
    error: null,
  },
};
const pagination = {
  count: 0,
  page_size: 20,
  current_page: 1,
  total_pages: 1,
  next: null,
  previous: null,
};

const state = {
  requests: [],
  coreMode: "normal",
  cacheStatus: "MISS",
  detailDelayMs: 0,
  detailStatus: 200,
};

function corsHeaders(requestId) {
  return {
    "Access-Control-Allow-Origin": `http://127.0.0.1:${appPort}`,
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Headers":
      "authorization,content-type,x-request-id,x-user-country",
    "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
    "Access-Control-Expose-Headers": "x-request-id,x-cache,server-timing",
    "Content-Type": "application/json",
    "X-Request-Id": requestId,
  };
}

function json(response, status, body, headers = {}) {
  const payload = JSON.stringify(body);
  response.writeHead(status, {
    "Content-Length": Buffer.byteLength(payload),
    ...headers,
  });
  response.end(payload);
}

function fixtureOrigin() {
  return `http://127.0.0.1:${corePort}`;
}

function svg(response, name) {
  const hue = [...name].reduce((sum, character) => sum + character.charCodeAt(0), 0) % 360;
  const payload = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1200" viewBox="0 0 800 1200"><rect width="800" height="1200" fill="hsl(${hue} 45% 24%)"/><circle cx="400" cy="440" r="220" fill="hsl(${hue} 60% 45%)"/><text x="400" y="900" text-anchor="middle" fill="white" font-size="64" font-family="sans-serif">${name}</text></svg>`;
  response.writeHead(200, {
    "Cache-Control": "public, max-age=3600",
    "Content-Length": Buffer.byteLength(payload),
    "Content-Type": "image/svg+xml",
  });
  response.end(payload);
}

async function readJson(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  if (chunks.length === 0) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function record(service, request, url, requestId) {
  state.requests.push({
    service,
    method: request.method,
    path: url.pathname,
    request_id: requestId,
    consumer: request.headers["x-api-consumer"] ?? null,
    catalog_visitor: request.headers["x-catalog-visitor"] ?? null,
  });
}

function isTrustedCatalogService(request) {
  return (
    request.headers["x-api-key"] === "fixture-key" &&
    request.headers["x-api-consumer"] === "web"
  );
}

function canReadCatalogDetail(request) {
  if (request.headers.authorization === "Bearer fixture-access") return true;
  const visitor = request.headers["x-catalog-visitor"] ?? "";
  return isTrustedCatalogService(request) && /^[0-9a-f]{64}$/.test(visitor);
}

const core = createServer(async (request, response) => {
  const url = new URL(request.url, `http://127.0.0.1:${corePort}`);
  const requestId = request.headers["x-request-id"]?.trim() || randomUUID();

  if (url.pathname === "/__fixture__/health") {
    return json(response, 200, { ok: true }, corsHeaders(requestId));
  }
  if (url.pathname === "/__fixture__/reset" && request.method === "POST") {
    state.requests = [];
    state.coreMode = "normal";
    state.cacheStatus = "MISS";
    state.detailDelayMs = 0;
    state.detailStatus = 200;
    user.allow_adult_content = false;
    return json(response, 200, { ok: true }, corsHeaders(requestId));
  }
  if (url.pathname === "/__fixture__/scenario" && request.method === "POST") {
    Object.assign(state, await readJson(request));
    return json(response, 200, { ok: true }, corsHeaders(requestId));
  }
  if (url.pathname === "/__fixture__/requests") {
    return json(response, 200, state.requests, corsHeaders(requestId));
  }
  if (url.pathname.startsWith("/__fixture__/images/")) {
    return svg(response, url.pathname.split("/").at(-1) ?? "fixture");
  }

  record("core", request, url, requestId);
  const headers = {
    ...corsHeaders(requestId),
    "Server-Timing": "app;dur=8, db;dur=2, proxy;dur=0",
  };

  if (request.method === "OPTIONS") {
    response.writeHead(204, headers);
    return response.end();
  }

  if (
    state.coreMode === "unavailable" &&
    url.pathname !== "/api/auth/login/"
  ) {
    return json(response, 503, { detail: "fixture unavailable" }, headers);
  }
  if (state.coreMode === "slow") {
    await delay(6_000);
  }

  if (url.pathname === "/api/auth/login/" && request.method === "POST") {
    const body = await readJson(request);
    if (
      body.email !== "phase0@example.test" ||
      body.password !== "fixture-password"
    ) {
      return json(response, 401, { detail: "Invalid fixture credentials" }, headers);
    }
    return json(
      response,
      200,
      { user, access: "fixture-access", refresh: "fixture-refresh" },
      headers,
    );
  }
  if (url.pathname === "/api/auth/user/") {
    const authorization = request.headers.authorization ?? "";
    if (authorization === "Bearer expired-access") {
      return json(response, 401, { detail: "expired" }, headers);
    }
    if (request.method === "PATCH") {
      const body = await readJson(request);
      user.allow_adult_content = body.allow_adult_content === true;
    }
    return json(response, 200, user, headers);
  }
  if (url.pathname === "/api/auth/token/refresh/") {
    return json(
      response,
      200,
      { access: "fixture-access", refresh: "fixture-refresh" },
      headers,
    );
  }
  if (
    url.pathname === "/api/auth/logout/" ||
    url.pathname === "/api/auth/logout-all/"
  ) {
    return json(response, 200, { detail: "ok" }, headers);
  }
  if (url.pathname === "/api/content/lists/") {
    return json(
      response,
      200,
      { metadata: { ...pagination, count: 2 }, results: [list, listTwo] },
      headers,
    );
  }
  if (url.pathname === "/api/content/lists/1/") {
    return json(response, 200, list, headers);
  }
  if (url.pathname === "/api/content/lists/1/stats/") {
    return json(
      response,
      200,
      {
        total_items: 0,
        pending_items: 0,
        completed_items: 0,
        member_count: 1,
        content_types: {},
      },
      headers,
    );
  }
  if (url.pathname === "/api/content/lists/1/items/") {
    return json(response, 200, { metadata: pagination, results: [] }, headers);
  }
  if (url.pathname === "/api/content/ratings/") {
    return json(response, 200, { metadata: pagination, results: [] }, headers);
  }
  if (url.pathname === "/api/content/1/") {
    if (!canReadCatalogDetail(request)) {
      return json(response, 403, { detail: "fixture catalog visitor required" }, headers);
    }
    if (state.detailDelayMs > 0) {
      await delay(state.detailDelayMs);
    }
    if (state.detailStatus !== 200) {
      return json(
        response,
        state.detailStatus,
        { detail: "fixture detail failure" },
        headers,
      );
    }
    return json(response, 200, contentItem, headers);
  }
  if (url.pathname === "/api/content/2/") {
    if (!canReadCatalogDetail(request)) {
      return json(response, 403, { detail: "fixture catalog visitor required" }, headers);
    }
    return json(response, 200, noArtworkContentItem, headers);
  }
  if (
    url.pathname === "/api/content/resolve-ids/" &&
    request.method === "POST"
  ) {
    const isAuthenticated =
      request.headers.authorization === "Bearer fixture-access";
    if (!isTrustedCatalogService(request) && !isAuthenticated) {
      return json(response, 403, { detail: "fixture catalog access denied" }, headers);
    }
    const body = await readJson(request);
    return json(
      response,
      200,
      {
        results: (body.items ?? []).map((item) => ({
          id: 1,
          source_api: item.source_api,
          external_id: item.external_id,
          content_type: item.content_type,
        })),
      },
      headers,
    );
  }
  if (
    url.pathname === "/api/content/items/get_or_create/" &&
    request.method === "POST"
  ) {
    return json(response, 200, contentItem, headers);
  }

  return json(response, 404, { detail: "fixture route not found" }, headers);
});

const proxy = createServer((request, response) => {
  const url = new URL(request.url, `http://127.0.0.1:${proxyPort}`);
  const requestId = request.headers["x-request-id"]?.trim() || randomUUID();
  record("proxy", request, url, requestId);
  const headers = {
    ...corsHeaders(requestId),
    "X-Cache": state.cacheStatus,
    "Server-Timing": "provider;dur=12",
  };

  if (url.pathname === "/v1/proxy/homepage") {
    const current = state.cacheStatus;
    state.cacheStatus = "HIT";
    return json(response, 200, homepage, { ...headers, "X-Cache": current });
  }
  if (url.pathname === "/v1/proxy/search") {
    const allowAdult = url.searchParams.get("adult") === "include";
    return json(response, 200, allowAdult ? adultSearch : search, {
      ...headers,
      "X-Cache": "BYPASS",
      "X-Content-Policy": allowAdult ? "adult-include" : "adult-exclude",
    });
  }
  return json(response, 404, { error: "fixture route not found" }, headers);
});

core.listen(corePort, "127.0.0.1");
proxy.listen(proxyPort, "127.0.0.1");

function shutdown() {
  core.close();
  proxy.close();
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
