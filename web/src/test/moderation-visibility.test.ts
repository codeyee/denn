import { afterEach, describe, expect, it, vi } from "vitest";

import { isWebModerationVisibilityEnabled } from "@/server/moderation-visibility-config";

describe("Web moderation visibility configuration", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("defaults off when unset", () => {
    vi.stubEnv("WEB_MODERATION_VISIBILITY_ENABLED", undefined);
    expect(isWebModerationVisibilityEnabled()).toBe(false);
  });

  it("enables only for an explicit true value", () => {
    for (const value of ["true", "TRUE", " True "]) {
      vi.stubEnv("WEB_MODERATION_VISIBILITY_ENABLED", value);
      expect(isWebModerationVisibilityEnabled()).toBe(true);
    }
    for (const value of ["false", "yes", "1", ""]) {
      vi.stubEnv("WEB_MODERATION_VISIBILITY_ENABLED", value);
      expect(isWebModerationVisibilityEnabled()).toBe(false);
    }
  });

  it("does not derive Web visibility from Core classification settings", () => {
    vi.stubEnv("WEB_MODERATION_VISIBILITY_ENABLED", undefined);
    vi.stubEnv("MODERATION_CLASSIFICATION_ENABLED", "true");
    vi.stubEnv("MODERATION_POLICY_MODE", "enforce");
    expect(isWebModerationVisibilityEnabled()).toBe(false);

    vi.stubEnv("WEB_MODERATION_VISIBILITY_ENABLED", "true");
    vi.stubEnv("MODERATION_CLASSIFICATION_ENABLED", "false");
    vi.stubEnv("MODERATION_POLICY_MODE", "shadow");
    expect(isWebModerationVisibilityEnabled()).toBe(true);
  });
});
