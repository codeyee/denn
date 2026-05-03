import { describe, expect, it } from "vitest";

import {
  normalizeInternalRedirectTarget,
} from "@/lib/auth/redirect";
import { requireAuthenticatedSession } from "@/lib/auth/protected-route";

describe("auth redirect helpers", () => {
  it("accepts only internal next targets", () => {
    expect(normalizeInternalRedirectTarget("/content/10")).toBe("/content/10");
    expect(normalizeInternalRedirectTarget("https://evil.example")).toBeNull();
    expect(normalizeInternalRedirectTarget("//evil.example")).toBeNull();
    expect(normalizeInternalRedirectTarget("content/10")).toBeNull();
  });

  it("throws for anonymous protected-route access", () => {
    expect(() =>
      requireAuthenticatedSession(
        {
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          needsCookieSync: false,
          resolution: "anonymous",
        },
        "/content/99",
        "?foo=bar",
      ),
    ).toThrow();
  });

  it("does not throw for authenticated or unavailable sessions", () => {
    expect(() =>
      requireAuthenticatedSession(
        {
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          needsCookieSync: false,
          resolution: "unavailable",
        },
        "/content/99",
      ),
    ).not.toThrow();

    expect(() =>
      requireAuthenticatedSession(
        {
          user: {
            id: 1,
            username: "alice",
            email: "alice@example.com",
          },
          accessToken: "token",
          refreshToken: "refresh",
          isAuthenticated: true,
          needsCookieSync: false,
          resolution: "authenticated",
        },
        "/content/99",
      ),
    ).not.toThrow();
  });
});
