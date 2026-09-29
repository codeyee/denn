import { renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { resolveHomepageContentIds } from "@/server/catalog";
import { useFeaturedItems } from "@/components/pages/HomePage/hooks/useFeaturedItems";
import { homepageActions } from "@/lib/api/actions/homepage";
import {
  ContentType,
  type HomepageResponse,
  type MovieDetail,
} from "@/lib/types";

const requestId = "homepage-moderation-test";

describe("homepage moderation resolution", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("resolves once, removes only current explicit items, and keeps remaining statuses and order", async () => {
    vi.stubEnv("WEB_MODERATION_VISIBILITY_ENABLED", "true");
    vi.stubEnv("PROXY_API_KEY", "test-key");
    const fetchMock = vi.fn().mockResolvedValue(
      Response.json({
        results: [
          resolved(1, "explicit", ContentType.MOVIE, "complete", "explicit"),
          resolved(2, "safe", ContentType.MOVIE, "complete", "safe"),
          resolved(3, "review", ContentType.MOVIE, "complete", "needs_review"),
          resolved(4, "pending", ContentType.MOVIE, "pending", null),
          resolved(5, "stale", ContentType.MOVIE, "stale", null),
          resolved(6, "missing", ContentType.MOVIE, "missing", null),
          resolved(7, "malformed", ContentType.MOVIE, "complete", "unknown"),
        ],
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const homepageResponse = homepage([
      ["explicit", "Explicit"],
      ["safe", "Safe"],
      ["review", "Needs review"],
      ["pending", "Pending"],
      ["stale", "Stale"],
      ["missing", "Missing"],
      ["malformed", "Malformed"],
      ["unresolved", "Unresolved"],
    ]);
    const unresolved = homepageResponse.movies.results.find(
      (item) => item.id === "unresolved",
    );
    if (unresolved) {
      unresolved.moderation = { status: "complete", classification: "explicit" };
    }

    const response = await resolveHomepageContentIds(
      homepageResponse,
      "CO",
      requestId,
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toContain("/content/resolve-ids/?country=CO");
    expect(response.movies.results.map((item) => item.id)).toEqual([
      "safe",
      "review",
      "pending",
      "stale",
      "missing",
      "malformed",
      "unresolved",
    ]);
    expect(response.movies.results.map((item) => item.moderation)).toEqual([
      { status: "complete", classification: "safe" },
      { status: "complete", classification: "needs_review" },
      { status: "pending", classification: null },
      { status: "stale", classification: null },
      { status: "missing", classification: null },
      { status: "complete", classification: "unknown" },
      undefined,
    ]);
    expect(response.movies.results[0]?.denn_id).toBe(2);

    const featured = renderHook(() => useFeaturedItems({
      movies: response.movies.results,
      tvShows: [],
      games: [],
      music: [],
    }));
    const featuredIds = featured.result.current.featuredItems.map((item) => item.id);
    expect(featuredIds).not.toContain("explicit");
    expect(featuredIds.every((id) =>
      response.movies.results.some((item) => item.id === id),
    )).toBe(true);
  });

  it("keeps homepage moderation off by default and does not attach moderation summaries", async () => {
    vi.stubEnv("WEB_MODERATION_VISIBILITY_ENABLED", "false");
    const fetchMock = vi.fn().mockResolvedValue(
      Response.json({
        results: [
          resolved(1, "explicit", ContentType.MOVIE, "complete", "explicit"),
        ],
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await resolveHomepageContentIds(
      homepage([["explicit", "Explicit"]]),
      null,
      requestId,
    );

    expect(response.movies.results).toHaveLength(1);
    expect(response.movies.results[0]?.id).toBe("explicit");
    expect(response.movies.results[0]?.moderation).toBeUndefined();
    expect(response.movies.results[0]?.denn_id).toBe(1);
  });

  it("leaves unresolved catalog items visible when Core returns no identity", async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ results: [] }));
    vi.stubGlobal("fetch", fetchMock);

    const response = await resolveHomepageContentIds(
      homepage([["unresolved", "Unresolved"]]),
      null,
      requestId,
    );

    expect(response.movies.results).toHaveLength(1);
    expect(response.movies.results[0]?.moderation).toBeUndefined();
  });

  it("routes browser suggestion refreshes through the same-origin homepage BFF", async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json(homepage([])));
    vi.stubGlobal("fetch", fetchMock);

    await homepageActions.getSuggestions({ limit: 30, country: "CO" });

    expect(fetchMock.mock.calls[0]?.[0]).toBe("/api/proxy/homepage?limit=30");
    const init = fetchMock.mock.calls[0]?.[1];
    const headers = new Headers(init?.headers);
    expect(headers.get("X-User-Country")).toBe("CO");
    expect(headers.has("X-Api-Key")).toBe(false);
  });
});

function homepage(
  movies: Array<[string, string]>,
): HomepageResponse {
  const results = movies.map(([id, title]): MovieDetail => ({
    id,
    type: "MOVIE",
    title,
    original_title: title,
    description: null,
    image_url: null,
    tagline: null,
    imdb_id: null,
    release_date: null,
    duration_minutes: null,
    status: null,
    authors: null,
    images: [],
    platforms: null,
  }));
  const empty = { results: [], metadata: { page: 1, total_results: 0, total_pages: 0 }, error: null };
  return {
    movies: { ...empty, results },
    "tv-shows": empty,
    games: empty,
    albums: empty,
    books: empty,
  };
}

function resolved(
  id: number,
  externalId: string,
  contentType: ContentType,
  status: string,
  classification: string | null,
) {
  return {
    id,
    source_api: "tmdb",
    external_id: externalId,
    content_type: contentType,
    moderation: { status, classification },
  };
}
