import { describe, expect, it } from "vitest";

import { queryKeys } from "@/lib/api/queries";

describe("queryKeys", () => {
  it("keeps country in suggestions and search keys", () => {
    expect(
      queryKeys.suggestions.byParams({ limit: 20, country: "CO" }),
    ).toEqual(["suggestions", { limit: 20, country: "CO" }]);

    expect(
      queryKeys.search.multi({
        query: "matrix",
        limit: 20,
        country: "CO",
        allowAdult: false,
      }),
    ).toEqual([
      "search",
      "multi",
      {
        query: "matrix",
        limit: 20,
        country: "CO",
        allowAdult: false,
      },
    ]);
  });

  it("separates browse family, mode, query, page, and country", () => {
    expect(
      queryKeys.browse.byParams({
        type: "movies",
        page: 2,
        sort: "recent",
        query: "dune",
        country: "CO",
      }),
    ).toEqual([
      "browse",
      {
        type: "movies",
        page: 2,
        sort: "recent",
        query: "dune",
        country: "CO",
      },
    ]);
  });

  it("separates list page and full-list caches", () => {
    expect(queryKeys.listItems.page(7, { page: 1, pageSize: 20 })).toEqual([
      "list-items",
      7,
      { page: 1, pageSize: 20 },
    ]);

    expect(queryKeys.listItems.full(7)).toEqual([
      "list-items",
      7,
      "full",
      null,
    ]);
  });

  it("isolates content state by viewer and profile filters", () => {
    expect(queryKeys.contentDetail.byId(42, "anonymous", "CO")).toEqual([
      "content-detail",
      "anonymous",
      42,
      "CO",
    ]);
    expect(queryKeys.contentDetail.byId(42, 7, "CO")).toEqual([
      "content-detail",
      7,
      42,
      "CO",
    ]);
    expect(
      queryKeys.profiles.tab("alice", "progress", {
        tab: "progress",
        page: 2,
        reviewed: true,
        view: "list",
      }),
    ).toEqual([
      "profiles",
      "alice",
      "progress",
      { tab: "progress", page: 2, reviewed: true },
    ]);
  });
});
