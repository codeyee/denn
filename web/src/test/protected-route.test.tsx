import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ProtectedRoute } from "@/components/common/providers/ProtectedRoute";
import { useAuthStore } from "@/stores/auth-store";

const navigateMock = vi.fn();
const invalidateMock = vi.fn();

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => navigateMock,
  useRouter: () => ({ invalidate: invalidateMock }),
  useLocation: ({
    select,
  }: {
    select: (loc: { pathname: string; searchStr: string }) => unknown;
  }) => select({ pathname: "/content/42", searchStr: "?tab=info" }),
}));

describe("ProtectedRoute", () => {
  beforeEach(() => {
    navigateMock.mockReset();
    invalidateMock.mockReset();
    useAuthStore.setState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      sessionResolution: "anonymous",
    });
  });

  it("shows the loading shell during the session boot window", () => {
    useAuthStore.setState({
      isAuthenticated: true,
      isLoading: false,
      sessionResolution: "pending",
    });

    render(
      <ProtectedRoute>
        <div>secret</div>
      </ProtectedRoute>,
    );

    expect(screen.queryByText("secret")).not.toBeInTheDocument();
    expect(navigateMock).not.toHaveBeenCalled();
  });

  it("renders a degraded message when the backend session check is unavailable", () => {
    useAuthStore.setState({
      sessionResolution: "unavailable",
    });

    render(
      <ProtectedRoute>
        <div>secret</div>
      </ProtectedRoute>,
    );

    expect(screen.getByText("Service unavailable")).toBeInTheDocument();
    expect(navigateMock).not.toHaveBeenCalled();
  });

  it("renders children when an authenticated session exists", () => {
    useAuthStore.setState({
      user: {
        id: 1,
        username: "alice",
        email: "alice@example.com",
      },
      isAuthenticated: true,
      sessionResolution: "authenticated",
    });

    render(
      <ProtectedRoute>
        <div>secret</div>
      </ProtectedRoute>,
    );

    expect(screen.getByText("secret")).toBeInTheDocument();
  });
});
