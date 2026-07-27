import { describe, expect, it } from "vitest";

import {
  profileDataSearchKey,
  publicProfileSearchSchema,
} from "@/lib/profileSearch";
import {
  formatJoinedAt,
  formatProfileDate,
} from "@/components/pages/PublicProfilePage/utils";
import type { ProfileSearchParams } from "@/lib/types";
import { formatReleaseDate } from "@/lib/utils/dateUtils";

describe("public profile search params", () => {
  it("normalizes valid shared filter URLs", () => {
    expect(
      publicProfileSearchSchema.parse({
        tab: "progress",
        type: "MOVIE,TV_SHOW",
        q: "  matrix  ",
        page: "3",
        status: ["backlog", "in_progress"],
        tvKind: "seasons",
        rated: "true",
        reviewed: "false",
        favorite: "true",
        minScore: "7.5",
        maxScore: "10",
        sort: "-score",
        view: "list",
      }),
    ).toEqual({
      tab: "progress",
      type: ["MOVIE", "TV_SHOW"],
      q: "matrix",
      page: 3,
      status: ["backlog", "in_progress"],
      tvKind: "seasons",
      rated: true,
      reviewed: false,
      favorite: true,
      minScore: 7.5,
      maxScore: 10,
      sort: "-score",
      view: "list",
    });
  });

  it("falls back safely for invalid values", () => {
    const result = publicProfileSearchSchema.parse({
      tab: "unknown",
      type: "PERSON",
      page: "-2",
      favorite: "maybe",
      minScore: "99",
      view: "table",
    });
    expect(result.tab).toBe("overview");
    expect(result.page).toBe(1);
    expect(result.type).toBeUndefined();
    expect(result.favorite).toBeUndefined();
    expect(result.minScore).toBeUndefined();
    expect(result.view).toBeUndefined();
  });

  it("uses a stable data key that ignores presentation changes", () => {
    const first: ProfileSearchParams = {
      tab: "progress",
      page: 1,
      type: ["MOVIE", "TV_SHOW"],
      status: ["backlog", "in_progress"],
      sort: "title",
      order: "asc",
      view: "grid",
    };
    const reordered: ProfileSearchParams = {
      view: "list",
      order: "asc",
      sort: "title",
      status: ["backlog", "in_progress"],
      type: ["MOVIE", "TV_SHOW"],
      page: 1,
      tab: "progress",
    };

    expect(profileDataSearchKey(first)).toBe(profileDataSearchKey(reordered));
    expect(profileDataSearchKey(first)).not.toBe(
      profileDataSearchKey({ ...first, order: "desc" }),
    );
  });
});

describe("public profile dates", () => {
  it("formats absolute and date-only values in UTC for stable hydration", () => {
    expect(formatJoinedAt("2025-01-01T00:30:00Z")).toBe("January 2025");
    expect(formatProfileDate("2024-01-01")).toBe("Jan 1, 2024");
    expect(formatReleaseDate("2024-01-01")).toBe("Jan 1, 2024");
  });
});
