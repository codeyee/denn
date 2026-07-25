import { describe, expect, it } from "vitest";

import {
  applyResolvedContentIds,
  collectContentIdentities,
} from "@/lib/api/contentResolution";
import { ContentType, type MultiSearchResponse } from "@/lib/types";
import { normalizeContentType } from "@/lib/utils/contentTypeUtils";

describe("content type normalization", () => {
  it.each([
    ["movie", ContentType.MOVIE],
    ["tv_show", ContentType.TV_SHOW],
    ["game", ContentType.GAME],
    ["album", ContentType.ALBUM],
    ["book", ContentType.BOOK],
    ["MOVIE", ContentType.MOVIE],
  ])("normalizes %s to %s", (input, expected) => {
    expect(normalizeContentType(input)).toBe(expected);
  });

  it("rejects unknown provider types", () => {
    expect(normalizeContentType("podcast")).toBeNull();
  });
});

describe("bulk content id resolution", () => {
  it("collects canonical identities from lowercase proxy payloads", () => {
    const response = proxyResponse([
      ["movies", "438631", "movie", "Dune"],
      ["albums", "album-1", "album", "Dune"],
    ]);

    expect(collectContentIdentities(response)).toEqual([
      {
        source_api: "tmdb",
        external_id: "438631",
        content_type: ContentType.MOVIE,
      },
      {
        source_api: "spotify",
        external_id: "album-1",
        content_type: ContentType.ALBUM,
      },
    ]);
  });

  it("applies stable Denn ids without changing provider identities", () => {
    const response = proxyResponse([
      ["movies", "438631", "movie", "Dune"],
      ["albums", "album-1", "album", "Dune"],
    ]);
    const resolved = applyResolvedContentIds(response, [
      {
        id: 41,
        source_api: "tmdb",
        external_id: "438631",
        content_type: ContentType.MOVIE,
      },
      {
        id: 42,
        source_api: "spotify",
        external_id: "album-1",
        content_type: ContentType.ALBUM,
      },
    ]);

    expect(resolved.movies.results[0]?.denn_id).toBe(41);
    expect(resolved.albums.results[0]?.denn_id).toBe(42);
  });
});

function proxyResponse(
  entries: Array<[keyof MultiSearchResponse, string, string, string]>,
) {
  const response = {
    movies: { results: [] },
    "tv-shows": { results: [] },
    games: { results: [] },
    albums: { results: [] },
    books: { results: [] },
  } as unknown as MultiSearchResponse;

  for (const [category, id, type, title] of entries) {
    response[category].results.push({
      id,
      type: type as ContentType,
      title,
    });
  }
  return response;
}
