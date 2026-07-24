import { beforeEach, describe, expect, it, vi } from "vitest";

import { api } from "@/lib/api/api";
import { useAuthStore } from "@/stores/auth-store";

vi.mock("@/lib/env", () => ({
  getApiUrl: () => "https://core.test/api",
}));

const jsonHeaders = { "Content-Type": "application/json" };
const unauthorized = () =>
  new Response(JSON.stringify({ detail: "expired" }), {
    status: 401,
    headers: jsonHeaders,
  });

describe("API session resilience", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    useAuthStore.setState({
      user: {
        id: 1,
        username: "alice",
        email: "alice@example.com",
      },
      accessToken: "expired-access",
      refreshToken: "valid-refresh",
      isAuthenticated: true,
      isLoading: false,
      error: null,
      sessionResolution: "authenticated",
    });
  });

  it.each([429, 500])(
    "keeps the known session when token refresh returns %s",
    async (refreshStatus) => {
      vi.stubGlobal(
        "fetch",
        vi
          .fn<typeof fetch>()
          .mockResolvedValueOnce(unauthorized())
          .mockResolvedValueOnce(
            new Response(JSON.stringify({ detail: "temporary outage" }), {
              status: refreshStatus,
              headers: jsonHeaders,
            }),
          ),
      );

      await expect(api.get("/content/1/", true)).rejects.toThrow(
        "Token refresh failed",
      );
      expectKnownSession("unavailable");
    },
  );

  it("keeps the known session when the backend is unreachable", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn<typeof fetch>()
        .mockResolvedValueOnce(unauthorized())
        .mockRejectedValueOnce(new TypeError("Failed to fetch")),
    );

    await expect(api.get("/content/1/", true)).rejects.toThrow();
    expectKnownSession("unavailable");
  });

  it("keeps the known session in a recoverable timeout state", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn<typeof fetch>()
        .mockResolvedValueOnce(unauthorized())
        .mockRejectedValueOnce(new DOMException("timed out", "TimeoutError")),
    );

    await expect(api.get("/content/1/", true)).rejects.toThrow();
    expectKnownSession("timeout");
  });

  it("clears an explicitly rejected refresh credential", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn<typeof fetch>()
        .mockResolvedValueOnce(unauthorized())
        .mockResolvedValueOnce(unauthorized()),
    );

    await expect(api.get("/content/1/", true)).rejects.toThrow(
      "Session expired",
    );
    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.accessToken).toBeNull();
    expect(state.refreshToken).toBeNull();
    expect(state.sessionResolution).toBe("expired");
  });

  it("deduplicates concurrent refreshes and recovers both requests", async () => {
    let refreshCalls = 0;
    const fetchMock = vi.fn<typeof fetch>(async (input, init) => {
      const url = String(input);
      if (url.endsWith("/auth/token/refresh/")) {
        refreshCalls += 1;
        await Promise.resolve();
        return new Response(
          JSON.stringify({
            access: "fresh-access",
            refresh: "fresh-refresh",
          }),
          { status: 200, headers: jsonHeaders },
        );
      }
      const authorization = new Headers(init?.headers).get("Authorization");
      if (authorization === "Bearer expired-access") return unauthorized();
      return new Response(JSON.stringify({ id: 1 }), {
        status: 200,
        headers: jsonHeaders,
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      Promise.all([
        api.get("/content/1/", true),
        api.get("/content/2/", true),
      ]),
    ).resolves.toEqual([{ id: 1 }, { id: 1 }]);

    expect(refreshCalls).toBe(1);
    expect(useAuthStore.getState().accessToken).toBe("fresh-access");
    expect(useAuthStore.getState().sessionResolution).toBe("authenticated");
  });

  it("recovers after a transient refresh failure", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(unauthorized())
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ detail: "temporary outage" }), {
          status: 500,
          headers: jsonHeaders,
        }),
      );
    vi.stubGlobal("fetch", fetchMock);
    await expect(api.get("/content/1/", true)).rejects.toThrow();
    expectKnownSession("unavailable");

    fetchMock
      .mockResolvedValueOnce(unauthorized())
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            access: "fresh-access",
            refresh: "fresh-refresh",
          }),
          { status: 200, headers: jsonHeaders },
        ),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ id: 1 }), {
          status: 200,
          headers: jsonHeaders,
        }),
      );

    await expect(api.get("/content/1/", true)).resolves.toEqual({ id: 1 });
    expect(useAuthStore.getState().sessionResolution).toBe("authenticated");
  });
});

function expectKnownSession(
  resolution: "unavailable" | "timeout",
) {
  const state = useAuthStore.getState();
  expect(state.isAuthenticated).toBe(true);
  expect(state.accessToken).toBe("expired-access");
  expect(state.refreshToken).toBe("valid-refresh");
  expect(state.sessionResolution).toBe(resolution);
}
