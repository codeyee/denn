import { describe, expect, it } from "vitest";

import {
  formatSeasonLocalTitle,
  formatSeasonTitle,
} from "@/lib/utils/titleUtils";

describe("season titles", () => {
  it("uses a colon separator for standalone season titles", () => {
    expect(formatSeasonTitle("Demon Slayer", "Demon Slayer", 1)).toBe(
      "Demon Slayer: Season 1",
    );
  });

  it("uses a specific season name without the numbered prefix", () => {
    expect(
      formatSeasonTitle("Demon Slayer", "Unwavering Resolve Arc", 1),
    ).toBe("Demon Slayer: Unwavering Resolve Arc");
  });

  it("keeps an explicit generic season name", () => {
    expect(formatSeasonTitle("Demon Slayer", "Season 2", 2)).toBe(
      "Demon Slayer: Season 2",
    );
  });

  it("removes the repeated series name inside a parent series view", () => {
    expect(
      formatSeasonLocalTitle(
        "Demon Slayer — Season 2: Entertainment District Arc",
        2,
        "Demon Slayer",
      ),
    ).toBe("Entertainment District Arc");
  });

  it("falls back to the numbered label when the provider repeats the show", () => {
    expect(formatSeasonLocalTitle("Demon Slayer", 1, "Demon Slayer")).toBe(
      "Season 1",
    );
  });
});
