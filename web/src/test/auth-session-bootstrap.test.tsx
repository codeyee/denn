import { render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { AuthSessionBootstrap } from "@/components/routes/AuthSessionBootstrap";
import { useAuthStore } from "@/stores/auth-store";

describe("AuthSessionBootstrap", () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: true,
      error: null,
      sessionResolution: "pending",
    });
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("hydrates an authenticated session snapshot into the store", async () => {
    render(
      <AuthSessionBootstrap
        session={{
          user: {
            id: 1,
            username: "alice",
            email: "alice@example.com",
          },
          accessToken: "access-token",
          refreshToken: "refresh-token",
          isAuthenticated: true,
          needsCookieSync: false,
          resolution: "authenticated",
        }}
      />,
    );

    await waitFor(() => {
      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(true);
      expect(state.accessToken).toBe("access-token");
      expect(state.sessionResolution).toBe("authenticated");
    });
  });

  it("clears stale client auth when the server asks for cookie sync", async () => {
    useAuthStore.setState({
      user: {
        id: 1,
        username: "alice",
        email: "alice@example.com",
      },
      accessToken: "stale-access",
      refreshToken: "stale-refresh",
      isAuthenticated: true,
      isLoading: true,
      error: null,
      sessionResolution: "pending",
    });

    render(
      <AuthSessionBootstrap
        session={{
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          needsCookieSync: true,
          resolution: "anonymous",
        }}
      />,
    );

    await waitFor(() => {
      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(false);
      expect(state.accessToken).toBeNull();
      expect(state.sessionResolution).toBe("anonymous");
    });
  });

  it("marks the session as unavailable without redirecting to anonymous", async () => {
    render(
      <AuthSessionBootstrap
        session={{
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          needsCookieSync: false,
          resolution: "unavailable",
        }}
      />,
    );

    await waitFor(() => {
      expect(useAuthStore.getState().sessionResolution).toBe("unavailable");
    });
  });
});
