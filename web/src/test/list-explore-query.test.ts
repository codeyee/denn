import { describe, expect, it } from "vitest";

import { parseQueryFromParams } from "@/components/pages/ListDetailPage/hooks/useExploreQuery";

describe("parseQueryFromParams", () => {
  it("parses TanStack-serialized pagination values", () => {
    const params = new URLSearchParams(
      'page=%222%22&page_size=%2250%22&group_by=%22context_status%22&sort=%22-added_at%22',
    );

    const query = parseQueryFromParams(params);

    expect(query.page).toBe(2);
    expect(query.pageSize).toBe(50);
    expect(query.groupBy).toBe("context_status");
    expect(query.sort).toEqual([{ field: "added_at", direction: "desc" }]);
  });

  it("keeps progress exploration parameters for dynamic lists", () => {
    const params = new URLSearchParams(
      "filter%5Btracking_status%5D=backlog&group_by=tracking_status&sort=tracking_status",
    );

    const query = parseQueryFromParams(params);

    expect(query.filters).toEqual({ tracking_status: "backlog" });
    expect(query.groupBy).toBe("tracking_status");
    expect(query.sort).toEqual([
      { field: "tracking_status", direction: "asc" },
    ]);
  });
});
