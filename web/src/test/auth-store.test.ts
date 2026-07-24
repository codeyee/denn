import { beforeEach, describe, expect, it, vi } from "vitest";

import { useAuthStore } from "@/stores/auth-store";

vi.mock("@/lib/env", () => ({
  getApiUrl: () => "https://core.test/api",
}));

const jsonHeaders = { "Content-Type": "application/json" };

describe("auth store transitions", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    useAuthStore.getState().clearSession();
  });

  it("stores one authenticated session after login", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>().mockResolvedValue(
        new Response(
          JSON.stringify({
            user: {
              id: 1,
              username: "alice",
              email: "alice@example.com",
            },
            access: "access-token",
            refresh: "refresh-token",
          }),
          { status: 200, headers: jsonHeaders },
        ),
      ),
    );

    await useAuthStore.getState().login("alice@example.com", "secret");

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.accessToken).toBe("access-token");
    expect(state.refreshToken).toBe("refresh-token");
    expect(state.sessionResolution).toBe("authenticated");
  });

  it("always reaches one anonymous terminal state after logout", async () => {
    useAuthStore.getState().setSession({
      user: {
        id: 1,
        username: "alice",
        email: "alice@example.com",
      },
      accessToken: "access-token",
      refreshToken: "refresh-token",
    });
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ detail: "ok" }), {
        status: 200,
        headers: jsonHeaders,
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await useAuthStore.getState().logout();

    const state = useAuthStore.getState();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(state.isAuthenticated).toBe(false);
    expect(state.accessToken).toBeNull();
    expect(state.refreshToken).toBeNull();
    expect(state.sessionResolution).toBe("anonymous");
  });
});
