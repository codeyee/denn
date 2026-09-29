import { describe, expect, it } from "vitest";

import {
  parseModerationSummary,
  shouldBlurModerationArtwork,
  visibleModerationSummary,
} from "@/lib/utils/moderationUtils";

describe("moderation summary handling", () => {
  it("accepts the allowlisted Core summary pairs", () => {
    expect(
      parseModerationSummary({ status: "complete", classification: "explicit" }),
    ).toEqual({ status: "complete", classification: "explicit" });
    expect(
      parseModerationSummary({ status: "complete", classification: "safe" }),
    ).toEqual({ status: "complete", classification: "safe" });
    expect(
      parseModerationSummary({ status: "complete", classification: "needs_review" }),
    ).toEqual({ status: "complete", classification: "needs_review" });
    expect(parseModerationSummary({ status: "stale", classification: null })).toEqual({
      status: "stale",
      classification: null,
    });
  });

  it("rejects invalid or inconsistent summaries instead of inferring safety", () => {
    expect(parseModerationSummary(null)).toBeNull();
    expect(parseModerationSummary({ status: "unknown", classification: "safe" })).toBeNull();
    expect(parseModerationSummary({ status: "stale", classification: "safe" })).toBeNull();
    expect(parseModerationSummary({ status: "missing", classification: "explicit" })).toBeNull();
    expect(parseModerationSummary({ status: "complete", classification: null })).toBeNull();
  });

  it("blurs only a complete explicit classification", () => {
    expect(shouldBlurModerationArtwork({ status: "complete", classification: "explicit" })).toBe(
      true,
    );
    expect(shouldBlurModerationArtwork({ status: "complete", classification: "safe" })).toBe(
      false,
    );
    expect(
      shouldBlurModerationArtwork({ status: "complete", classification: "needs_review" }),
    ).toBe(false);
    expect(shouldBlurModerationArtwork({ status: "missing", classification: null })).toBe(false);
    expect(shouldBlurModerationArtwork({ status: "stale", classification: null })).toBe(false);
    expect(shouldBlurModerationArtwork(undefined)).toBe(false);
  });

  it("suppresses moderation-driven detail artwork when Web visibility is disabled", () => {
    const explicit = { status: "complete", classification: "explicit" } as const;

    expect(visibleModerationSummary(explicit, false)).toBeUndefined();
    expect(visibleModerationSummary(explicit, true)).toEqual(explicit);
  });

  it("honors adult-content opt-in only for complete explicit artwork", () => {
    const explicit = { status: "complete", classification: "explicit" } as const;
    expect(shouldBlurModerationArtwork(explicit, false)).toBe(true);
    expect(shouldBlurModerationArtwork(explicit, true)).toBe(false);
    expect(
      shouldBlurModerationArtwork(
        { status: "complete", classification: "needs_review" },
        false,
      ),
    ).toBe(false);
    for (const status of ["missing", "pending", "stale", "error"] as const) {
      expect(
        shouldBlurModerationArtwork({ status, classification: null }, false),
      ).toBe(false);
    }
    expect(shouldBlurModerationArtwork(undefined, false)).toBe(false);
  });
});
