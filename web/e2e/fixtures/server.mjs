import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import { Buffer } from "node:buffer";
import process from "node:process";
import { setTimeout as delay } from "node:timers/promises";
import { URL } from "node:url";

const corePort = 18000;
const proxyPort = 18080;
const user = {
  id: 1,
  username: "phase0-fixture",
  email: "phase0@example.test",
  first_name: "Phase",
  last_name: "Zero",
};
const now = "2026-07-23T12:00:00Z";
const movie = {
  id: "101",
  type: "MOVIE",
  title: "Phase Zero Movie",
  original_title: "Phase Zero Movie",
  description: "Deterministic metadata for browser guardrails.",
  image_url: null,
  tagline: null,
  imdb_id: null,
  release_date: "2024-01-01",
  duration_minutes: 120,
  status: "Released",
  authors: [{ name: "Fixture Director", type: "DIRECTOR" }],
  images: [],
  platforms: null,
};
const contentItem = {
  id: 1,
  source_api: "TMDB",
  external_id: "101",
  content_type: "MOVIE",
  rating_count: 0,
  average_rating: null,
  created_at: now,
  source_data: movie,
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
const proxyMetadata = { page: 1, total_results: 1, total_pages: 1 };
const emptyProxyCategory = {
  metadata: { page: 1, total_results: 0, total_pages: 0 },
  results: [],
  error: "",
};
const homepage = {
  movies: { metadata: proxyMetadata, results: [movie], error: "" },
  "tv-shows": emptyProxyCategory,
  games: emptyProxyCategory,
  albums: emptyProxyCategory,
  books: emptyProxyCategory,
};
const search = {
  movies: {
    metadata: proxyMetadata,
    results: [
      {
        id: movie.id,
        type: movie.type,
        title: movie.title,
        original_title: movie.original_title,
        description: movie.description,
        image_url: null,
        release_date: movie.release_date,
        authors: movie.authors,
      },
    ],
    error: null,
  },
  "tv-shows": { ...emptyProxyCategory, error: null },
  games: { ...emptyProxyCategory, error: null },
  albums: { ...emptyProxyCategory, error: null },
  books: { ...emptyProxyCategory, error: null },
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
};

function corsHeaders(requestId) {
  return {
    "Access-Control-Allow-Origin": "http://127.0.0.1:4173",
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Headers":
      "authorization,content-type,x-request-id,x-user-country",
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
  });
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
    return json(response, 200, { ok: true }, corsHeaders(requestId));
  }
  if (url.pathname === "/__fixture__/scenario" && request.method === "POST") {
    Object.assign(state, await readJson(request));
    return json(response, 200, { ok: true }, corsHeaders(requestId));
  }
  if (url.pathname === "/__fixture__/requests") {
    return json(response, 200, state.requests, corsHeaders(requestId));
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
  if (url.pathname === "/api/auth/logout/") {
    return json(response, 200, { detail: "ok" }, headers);
  }
  if (url.pathname === "/api/content/lists/") {
    return json(
      response,
      200,
      { metadata: { ...pagination, count: 1 }, results: [list] },
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
    return json(response, 200, contentItem, headers);
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
    return json(response, 200, search, { ...headers, "X-Cache": "BYPASS" });
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
