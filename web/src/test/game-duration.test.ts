import { describe, expect, it } from "vitest";

import {
  formatGameDuration,
  getGameDurationRows,
} from "@/lib/utils/gameDuration";

describe("game duration", () => {
  it("formats minutes and hours for the detail page", () => {
    expect(formatGameDuration(1800)).toBe("30 min");
    expect(formatGameDuration(5400)).toBe("1.5 h");
    expect(formatGameDuration(36000)).toBe("10 h");
  });

  it("keeps only available metrics for partial estimates", () => {
    expect(getGameDurationRows({
      source: "igdb",
      status: "matched",
      hastily_seconds: 36000,
      completely_seconds: 72000,
    })).toEqual([
      { label: "Rushed", value: "10 h" },
      { label: "Complete", value: "20 h" },
    ]);
  });

  it("renders no rows when the source has no usable data", () => {
    expect(getGameDurationRows({ source: "igdb", status: "no_data" })).toEqual([]);
  });

  it("discards estimates above 3000 hours while keeping valid metrics", () => {
    expect(getGameDurationRows({
      source: "igdb",
      status: "matched",
      hastily_seconds: 10 * 60 * 60,
      normally_seconds: 3001 * 60 * 60,
      completely_seconds: 20 * 60 * 60,
    })).toEqual([
      { label: "Rushed", value: "10 h" },
      { label: "Complete", value: "20 h" },
    ]);
  });

  it("hides estimates when the available metrics are not ordered", () => {
    expect(getGameDurationRows({
      source: "igdb",
      status: "matched",
      hastily_seconds: 100 * 60 * 60,
      normally_seconds: 50 * 60 * 60,
      completely_seconds: 200 * 60 * 60,
    })).toEqual([]);
  });
});
