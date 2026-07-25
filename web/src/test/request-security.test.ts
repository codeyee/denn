import { describe, expect, it } from "vitest";

import {
  createFixedWindowRateLimiter,
  readLimitedJson,
  RequestBodyTooLargeError,
} from "@/server/request-security";
import {
  buildProxyUrl,
  isCatalogDiscoveryPath,
  isSafeProxyPath,
} from "@/routes/api/proxy/$";
import { isValidPayload } from "@/routes/api/perf/vitals";
import {
  buildCoreUrl,
  isPublicContentDetailRequest,
  isPublicCoreRequest,
  isSafeCorePath,
} from "@/server/core-bff";
import {
  createCatalogVisitorCookieValue,
  readCatalogVisitorId,
} from "@/server/catalog-visitor";

describe("BFF request security", () => {
  it("keeps proxy requests under the configured base path", () => {
    expect(buildProxyUrl("http://proxy:8080/v1/proxy", "movies/123", "?country=CO"))
      .toBe("http://proxy:8080/v1/proxy/movies/123?country=CO");
    expect(isSafeProxyPath("../health")).toBe(false);
    expect(isSafeProxyPath("%2e%2e/health")).toBe(false);
    expect(isSafeProxyPath("%252e%252e/health")).toBe(false);
    expect(isSafeProxyPath("movies\\..\\health")).toBe(false);
    expect(() => buildProxyUrl("http://proxy:8080/v1/proxy", "../health", ""))
      .toThrow("Unsafe proxy path");
  });

  it("decorates only public discovery responses with stable ids", () => {
    expect(isCatalogDiscoveryPath("homepage")).toBe(true);
    expect(isCatalogDiscoveryPath("search")).toBe(true);
    expect(isCatalogDiscoveryPath("movies/550")).toBe(false);
  });

  it("keeps authenticated core requests under the configured API path", () => {
    expect(
      buildCoreUrl(
        "http://core:8000/api",
        "content/lists/1/",
        "?country=CO",
      ),
    ).toBe("http://core:8000/api/content/lists/1/?country=CO");
    expect(isSafeCorePath("../admin/")).toBe(false);
    expect(isSafeCorePath("%252e%252e/admin/")).toBe(false);
    expect(() =>
      buildCoreUrl("http://core:8000/api", "../admin/", ""),
    ).toThrow("Unsafe core path");
  });

  it("allows only strict anonymous core read patterns", () => {
    expect(isPublicCoreRequest("GET", "profiles/alice/")).toBe(true);
    expect(
      isPublicCoreRequest("HEAD", "profiles/alice/completed/"),
    ).toBe(true);
    expect(isPublicCoreRequest("GET", "content/42/")).toBe(true);
    expect(isPublicCoreRequest("GET", "content/lists/7/")).toBe(true);
    expect(isPublicCoreRequest("PATCH", "profiles/me/")).toBe(false);
    expect(isPublicCoreRequest("GET", "profiles/me/")).toBe(false);
    expect(isPublicCoreRequest("GET", "content/lists/7/items/")).toBe(false);
    expect(isPublicCoreRequest("GET", "profiles/alice/../../admin/")).toBe(
      false,
    );
    expect(isPublicCoreRequest("HEAD", "content/42/")).toBe(true);
    expect(isPublicCoreRequest("POST", "content/42/")).toBe(false);
    expect(isPublicCoreRequest("GET", "content/resolve-ids/")).toBe(false);
    expect(isPublicContentDetailRequest("GET", "content/42/")).toBe(true);
    expect(isPublicContentDetailRequest("POST", "content/42/")).toBe(false);
  });

  it("accepts only server-signed catalog visitor cookies", async () => {
    const visitorId = "a".repeat(32);
    const signed = await createCatalogVisitorCookieValue(
      visitorId,
      "fixture-key",
    );

    expect(await readCatalogVisitorId(signed, "fixture-key")).toBe(visitorId);
    expect(
      await readCatalogVisitorId(
        `${visitorId}.${"b".repeat(64)}`,
        "fixture-key",
      ),
    ).toBeNull();
    expect(
      await readCatalogVisitorId(signed, "different-key"),
    ).toBeNull();
  });

  it("accepts only bounded Web Vitals fields", () => {
    expect(isValidPayload({ name: "LCP", value: 1_200, route: "/content/1" }))
      .toBe(true);
    expect(isValidPayload({ name: "custom", value: 1 })).toBe(false);
    expect(isValidPayload({ name: "LCP", value: Number.POSITIVE_INFINITY }))
      .toBe(false);
    expect(isValidPayload({ name: "LCP", value: 1, route: "x".repeat(600) }))
      .toBe(false);
  });

  it("rejects oversized JSON bodies even without content-length", async () => {
    const request = new Request("http://localhost/api/perf/vitals", {
      method: "POST",
      body: JSON.stringify({ value: "x".repeat(100) }),
    });

    await expect(readLimitedJson(request, 32)).rejects.toBeInstanceOf(
      RequestBodyTooLargeError,
    );
  });

  it("resets the fixed-window limiter after the configured interval", () => {
    let now = 0;
    const limiter = createFixedWindowRateLimiter({
      limit: 2,
      windowMs: 1_000,
      now: () => now,
    });

    expect(limiter.consume()).toBe(true);
    expect(limiter.consume()).toBe(true);
    expect(limiter.consume()).toBe(false);
    now = 1_000;
    expect(limiter.consume()).toBe(true);
  });
});
