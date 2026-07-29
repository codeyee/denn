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
      main_story_seconds: 36000,
      completionist_seconds: 72000,
    })).toEqual([
      { label: "Main Story", value: "10 h" },
      { label: "Completionist", value: "20 h" },
    ]);
  });

  it("renders no rows when the source has no usable data", () => {
    expect(getGameDurationRows({ source: "igdb", status: "no_data" })).toEqual([]);
  });
});
