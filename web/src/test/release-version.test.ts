import { afterEach, describe, expect, it } from "vitest";

import {
  getReleaseSha,
  releaseVersionResponse,
} from "@/routes/api/version";

const originalBuildSha = process.env.BUILD_SHA;

afterEach(() => {
  if (originalBuildSha === undefined) {
    delete process.env.BUILD_SHA;
  } else {
    process.env.BUILD_SHA = originalBuildSha;
  }
});

describe("release version endpoint", () => {
  it("exposes only a normalized full commit SHA without caching", async () => {
    process.env.BUILD_SHA = "A".repeat(40);

    const response = releaseVersionResponse();

    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({
      service: "web",
      sha: "a".repeat(40),
    });
  });

  it("fails closed to unknown for absent or invalid release metadata", () => {
    process.env.BUILD_SHA = "not-a-sha";
    expect(getReleaseSha()).toBe("unknown");

    delete process.env.BUILD_SHA;
    expect(getReleaseSha()).toBe("unknown");
  });
});
