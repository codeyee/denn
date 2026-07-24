import { beforeEach, describe, expect, it, vi } from "vitest";

import { api } from "@/lib/api/api";
import { useAuthStore } from "@/stores/auth-store";

const jsonHeaders = { "Content-Type": "application/json" };

describe("BFF API session behavior", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    useAuthStore.setState({
      user: {
        id: 1,
        username: "alice",
        email: "alice@example.com",
      },
      isAuthenticated: true,
      isLoading: false,
      error: null,
      sessionResolution: "authenticated",
    });
  });

  it("sends authenticated reads only to the same-origin core BFF", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ id: 1 }), {
        status: 200,
        headers: jsonHeaders,
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(api.get("/content/1/", true)).resolves.toEqual({ id: 1 });

    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe("/api/core/content/1/");
    expect(new Headers(init?.headers).has("Authorization")).toBe(false);
  });

  it("preserves the known user on an operational BFF failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>().mockResolvedValue(
        new Response(JSON.stringify({ detail: "temporary outage" }), {
          status: 502,
          headers: jsonHeaders,
        }),
      ),
    );

    await expect(api.get("/content/1/", true)).rejects.toThrow(
      "temporary outage",
    );
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    expect(useAuthStore.getState().user?.username).toBe("alice");
  });

  it("clears client identity only after the BFF confirms expiry", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>().mockResolvedValue(
        new Response(JSON.stringify({ detail: "Session expired." }), {
          status: 401,
          headers: jsonHeaders,
        }),
      ),
    );

    await expect(api.get("/content/1/", true)).rejects.toThrow(
      "Session expired",
    );
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(useAuthStore.getState().sessionResolution).toBe("expired");
  });

  it("adds a double-submit CSRF header to core mutations", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ csrfToken: "a".repeat(64) }), {
          status: 200,
          headers: jsonHeaders,
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ id: 1 }), {
          status: 200,
          headers: jsonHeaders,
        }),
      );
    vi.stubGlobal("fetch", fetchMock);

    await api.patch("/auth/user/", { first_name: "Alice" }, true);

    const mutation = fetchMock.mock.calls.find(
      ([url]) => url === "/api/core/auth/user/",
    );
    expect(mutation).toBeDefined();
    expect(new Headers(mutation?.[1]?.headers).get("X-CSRF-Token")).toBe(
      "a".repeat(64),
    );
  });
});
