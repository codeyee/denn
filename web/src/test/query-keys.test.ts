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

  it("separates anonymous and authenticated content detail caches", () => {
    expect(queryKeys.contentDetail.byId(7, "CO")).toEqual([
      "content-detail",
      7,
      "CO",
      "anonymous",
    ]);
    expect(queryKeys.contentDetail.byId(7, "CO", 42)).toEqual([
      "content-detail",
      7,
      "CO",
      42,
    ]);
  });
});
