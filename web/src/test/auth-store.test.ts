import { beforeEach, describe, expect, it, vi } from "vitest";

import { useAuthStore } from "@/stores/auth-store";
import { AUTH_TIMEOUT_MESSAGE } from "@/lib/auth/constants";

const jsonHeaders = { "Content-Type": "application/json" };

describe("auth store transitions", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    useAuthStore.getState().clearSession();
  });

  it("stores identity but never JWTs after BFF login", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ csrfToken: "a".repeat(64) }), {
          status: 200,
          headers: jsonHeaders,
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            user: {
              id: 1,
              username: "alice",
              email: "alice@example.com",
            },
          }),
          { status: 200, headers: jsonHeaders },
        ),
      );
    vi.stubGlobal("fetch", fetchMock);

    await useAuthStore.getState().login("alice@example.com", "secret");

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.user?.username).toBe("alice");
    expect("accessToken" in state).toBe(false);
    expect("refreshToken" in state).toBe(false);
    expect(localStorage.getItem("auth-storage")).not.toMatch(
      /access|refresh|eyJ/,
    );
  });

  it("reaches one anonymous terminal state after BFF logout", async () => {
    useAuthStore.getState().setSession({
      user: {
        id: 1,
        username: "alice",
        email: "alice@example.com",
      },
    });
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>().mockResolvedValue(
        new Response(JSON.stringify({ detail: "ok" }), {
          status: 200,
          headers: jsonHeaders,
        }),
      ),
    );

    await useAuthStore.getState().logout();

    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(useAuthStore.getState().sessionResolution).toBe("anonymous");
  });

  it("shows an actionable message when an auth request times out", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockRejectedValue(
        new DOMException("signal timed out", "TimeoutError"),
      );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      useAuthStore
        .getState()
        .login("alice@example.com", "secret"),
    ).rejects.toThrow(AUTH_TIMEOUT_MESSAGE);

    expect(useAuthStore.getState().error).toBe(AUTH_TIMEOUT_MESSAGE);
    expect(useAuthStore.getState().isLoading).toBe(false);
  });
});
