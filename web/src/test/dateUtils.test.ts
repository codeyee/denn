import { describe, expect, it } from "vitest";

import { formatReleaseDate } from "@/lib/utils/dateUtils";

describe("formatReleaseDate", () => {
  it("formats release dates as calendar dates independent of local timezone", () => {
    expect(formatReleaseDate("2026-07-15T00:00:00Z")).toBe("Jul 15, 2026");
  });

  it("preserves invalid provider values for diagnosis", () => {
    expect(formatReleaseDate("unknown")).toBe("unknown");
  });

  it("returns an empty label when no release date exists", () => {
    expect(formatReleaseDate(null)).toBe("");
  });
});
