import { afterEach, describe, expect, it, vi } from "vitest";

import { resolveDiscoveryContentIds } from "@/server/catalog";
import {
  ContentType,
  type BrowseResponse,
  type MultiSearchResponse,
  type SearchItem,
} from "@/lib/types";

const requestId = "discovery-moderation-test";

describe("search and Browse moderation summaries", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("attaches the resolved summary to search items from the same bulk response", async () => {
    vi.stubEnv("PROXY_API_KEY", "test-key");
    const fetchMock = mockResolve([
      resolved(1, "explicit-movie", ContentType.MOVIE, "complete", "explicit"),
      resolved(2, "review-movie", ContentType.MOVIE, "complete", "needs_review"),
      resolved(3, "pending-show", ContentType.TV_SHOW, "pending", null),
    ]);
    const source = search({
      movies: [item("explicit-movie", ContentType.MOVIE), item("review-movie", ContentType.MOVIE)],
      "tv-shows": [item("pending-show", ContentType.TV_SHOW), item("no-identity", ContentType.TV_SHOW)],
    });

    const response = await resolveDiscoveryContentIds(source, null, requestId, true);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(response.movies.results.map((entry) => entry.moderation)).toEqual([
      { status: "complete", classification: "explicit" },
      { status: "complete", classification: "needs_review" },
    ]);
    expect(response["tv-shows"].results.map((entry) => entry.moderation)).toEqual([
      { status: "pending", classification: null },
      undefined,
    ]);
    expect(response.movies.results.map((entry) => entry.denn_id)).toEqual([1, 2]);
    expect(response.movies.results).toHaveLength(2);
  });

  it("does not drop non-safe search items", async () => {
    vi.stubEnv("PROXY_API_KEY", "test-key");
    mockResolve([resolved(1, "explicit-movie", ContentType.MOVIE, "complete", "explicit")]);

    const response = await resolveDiscoveryContentIds(
      search({ movies: [item("explicit-movie", ContentType.MOVIE)] }),
      null,
      requestId,
      true,
    );

    expect(response.movies.results.map((entry) => entry.id)).toEqual(["explicit-movie"]);
  });

  it("attaches summaries to Browse items and still drops unresolved ones", async () => {
    vi.stubEnv("PROXY_API_KEY", "test-key");
    mockResolve([resolved(7, "explicit-game", ContentType.GAME, "complete", "explicit")]);
    const source: BrowseResponse = {
      type: "games",
      mode: "popular",
      status: "complete",
      results: [item("explicit-game", ContentType.GAME), item("no-identity", ContentType.GAME)],
      metadata: { page: 1, total_results: 2, total_pages: 1 },
      error: null,
    };

    const response = await resolveDiscoveryContentIds(source, null, requestId, true);

    expect(response.results.map((entry) => entry.id)).toEqual(["explicit-game"]);
    expect(response.results[0]?.moderation).toEqual({
      status: "complete",
      classification: "explicit",
    });
  });

  it("attaches nothing when Web visibility is off, even if Core returns a summary", async () => {
    vi.stubEnv("PROXY_API_KEY", "test-key");
    mockResolve([resolved(1, "explicit-movie", ContentType.MOVIE, "complete", "explicit")]);

    const response = await resolveDiscoveryContentIds(
      search({ movies: [item("explicit-movie", ContentType.MOVIE)] }),
      null,
      requestId,
      false,
    );

    expect(response.movies.results[0]?.moderation).toBeUndefined();
    expect(response.movies.results[0]?.denn_id).toBe(1);
  });

  it("defaults to the server-only flag", async () => {
    vi.stubEnv("PROXY_API_KEY", "test-key");
    vi.stubEnv("WEB_MODERATION_VISIBILITY_ENABLED", "true");
    mockResolve([resolved(1, "explicit-movie", ContentType.MOVIE, "complete", "explicit")]);

    const response = await resolveDiscoveryContentIds(
      search({ movies: [item("explicit-movie", ContentType.MOVIE)] }),
      null,
      requestId,
    );

    expect(response.movies.results[0]?.moderation).toEqual({
      status: "complete",
      classification: "explicit",
    });
  });
});

function mockResolve(results: unknown[]) {
  const fetchMock = vi.fn().mockResolvedValue(Response.json({ results }));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function item(id: string, type: ContentType): SearchItem {
  return { id, type, title: id };
}

function search(
  categories: Partial<Record<keyof MultiSearchResponse, SearchItem[]>>,
): MultiSearchResponse {
  const category = (results: SearchItem[] = []) => ({
    results,
    metadata: { page: 1, total_results: results.length, total_pages: 1 },
    error: null,
  });
  return {
    movies: category(categories.movies),
    "tv-shows": category(categories["tv-shows"]),
    games: category(categories.games),
    albums: category(categories.albums),
    books: category(categories.books),
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
