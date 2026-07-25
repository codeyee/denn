import { describe, expect, it } from "vitest";

import { publicProfileSearchSchema } from "@/lib/profileSearch";
import {
  formatJoinedAt,
  formatProfileDate,
} from "@/components/pages/PublicProfilePage/utils";
import { formatReleaseDate } from "@/lib/utils/dateUtils";

describe("public profile search params", () => {
  it("normalizes valid shared filter URLs", () => {
    expect(
      publicProfileSearchSchema.parse({
        tab: "ratings",
        type: "MOVIE",
        q: "  matrix  ",
        page: "3",
        kind: "reviews",
        favorite: "true",
        minScore: "7.5",
        maxScore: "10",
        sort: "-score",
      }),
    ).toEqual({
      tab: "ratings",
      type: "MOVIE",
      q: "matrix",
      page: 3,
      kind: "reviews",
      favorite: true,
      minScore: 7.5,
      maxScore: 10,
      sort: "-score",
    });
  });

  it("falls back safely for invalid values", () => {
    const result = publicProfileSearchSchema.parse({
      tab: "unknown",
      type: "PERSON",
      page: "-2",
      favorite: "maybe",
      minScore: "99",
    });
    expect(result.tab).toBe("overview");
    expect(result.page).toBe(1);
    expect(result.type).toBeUndefined();
    expect(result.favorite).toBeUndefined();
    expect(result.minScore).toBeUndefined();
  });
});

describe("public profile dates", () => {
  it("formats absolute and date-only values in UTC for stable hydration", () => {
    expect(formatJoinedAt("2025-01-01T00:30:00Z")).toBe("January 2025");
    expect(formatProfileDate("2024-01-01")).toBe("Jan 1, 2024");
    expect(formatReleaseDate("2024-01-01")).toBe("Jan 1, 2024");
  });
});
