import { beforeEach, describe, expect, it, vi } from "vitest";

const authMocks = vi.hoisted(() => ({
  getAccessToken: vi.fn<() => string | null>(),
  refreshAuthCookies: vi.fn<() => Promise<string | null>>(),
}));

vi.mock("@/server/auth-cookies", () => authMocks);
vi.mock("@/lib/env", () => ({
  getApiUrl: () => "http://core.test/api",
}));

import { forwardCoreRequest } from "@/server/core-bff";

describe("public core BFF reads", () => {
  beforeEach(() => {
    authMocks.getAccessToken.mockReset();
    authMocks.refreshAuthCookies.mockReset();
    vi.restoreAllMocks();
  });

  it("retries a stale authenticated public read anonymously", async () => {
    authMocks.getAccessToken.mockReturnValue("expired-access");
    authMocks.refreshAuthCookies.mockResolvedValue(null);
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ detail: "expired" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ profile: { username: "alice" } }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );
    vi.stubGlobal("fetch", fetchMock);

    const response = await forwardCoreRequest(
      new Request("http://denn.test/api/core/profiles/alice/"),
      "profiles/alice/",
    );

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(
      new Headers(fetchMock.mock.calls[0]?.[1]?.headers).get("Authorization"),
    ).toBe("Bearer expired-access");
    expect(
      new Headers(fetchMock.mock.calls[1]?.[1]?.headers).has("Authorization"),
    ).toBe(false);
  });
});
