import { describe, expect, it } from "vitest";

import {
  parseModerationSummary,
  shouldBlurModerationArtwork,
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
});
