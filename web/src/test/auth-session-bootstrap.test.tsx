import { render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { AuthSessionBootstrap } from "@/components/routes/AuthSessionBootstrap";
import { useAuthStore } from "@/stores/auth-store";

describe("AuthSessionBootstrap", () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: null,
      isAuthenticated: false,
      isLoading: true,
      error: null,
      sessionResolution: "pending",
    });
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("hydrates only the authenticated identity snapshot", async () => {
    render(
      <AuthSessionBootstrap
        session={{
          user: {
            id: 1,
            username: "alice",
            email: "alice@example.com",
          },
          isAuthenticated: true,
          resolution: "authenticated",
        }}
      />,
    );

    await waitFor(() => {
      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(true);
      expect(state.user?.username).toBe("alice");
      expect("accessToken" in state).toBe(false);
      expect(state.sessionResolution).toBe("authenticated");
    });
  });

  it("clears stale client identity after server-confirmed expiry", async () => {
    useAuthStore.setState({
      user: {
        id: 1,
        username: "alice",
        email: "alice@example.com",
      },
      isAuthenticated: true,
      sessionResolution: "pending",
    });

    render(
      <AuthSessionBootstrap
        session={{
          user: null,
          isAuthenticated: false,
          resolution: "expired",
        }}
      />,
    );

    await waitFor(() => {
      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(false);
      expect(state.sessionResolution).toBe("expired");
    });
  });

  it("marks the session unavailable without overwriting known identity", async () => {
    useAuthStore.setState({
      user: {
        id: 1,
        username: "alice",
        email: "alice@example.com",
      },
      isAuthenticated: true,
    });
    render(
      <AuthSessionBootstrap
        session={{
          user: null,
          isAuthenticated: false,
          resolution: "unavailable",
        }}
      />,
    );

    await waitFor(() => {
      expect(useAuthStore.getState().sessionResolution).toBe("unavailable");
      expect(useAuthStore.getState().user?.username).toBe("alice");
    });
  });
});
