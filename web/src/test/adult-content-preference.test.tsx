import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AdultContentPreference } from "@/components/pages/SettingsPage/AdultContentPreference";
import { authActions } from "@/lib/api/actions";
import { useAuthStore } from "@/stores/auth-store";

const { invalidate, patchProfile } = vi.hoisted(() => ({
  invalidate: vi.fn(),
  patchProfile: vi.fn(),
}));

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-router")>();
  return { ...actual, useRouter: () => ({ invalidate }) };
});

vi.mock("@/lib/api/actions", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api/actions")>();
  return {
    ...actual,
    authActions: { ...actual.authActions, patchProfile },
  };
});

describe("AdultContentPreference", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.getState().setUser(null);
  });

  it("persists opt-in and explains its search and detail-artwork effects", async () => {
    vi.mocked(authActions.patchProfile).mockResolvedValue({
      id: 7,
      username: "viewer",
      email: "viewer@example.test",
      allow_adult_content: true,
    });
    const queryClient = new QueryClient();

    render(
      <QueryClientProvider client={queryClient}>
        <AdultContentPreference enabled={false} />
      </QueryClientProvider>,
    );

    expect(
      screen.getByText(/explicit artwork on detail pages is shown without blur/i),
    ).toBeInTheDocument();
    const checkbox = screen.getByRole("checkbox", {
      name: "Allow adult content in search and detail artwork",
    });
    fireEvent.click(checkbox);

    await waitFor(() => {
      expect(authActions.patchProfile).toHaveBeenCalledWith({
        allow_adult_content: true,
      });
      expect(useAuthStore.getState().user?.allow_adult_content).toBe(true);
    });
  });
});
