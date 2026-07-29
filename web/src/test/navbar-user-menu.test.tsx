import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

const logout = vi.fn();

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    children,
    to,
    params,
    search: _search,
    preload: _preload,
    ...props
  }: {
    children: ReactNode;
    to: string;
    params?: { username?: string };
    search?: unknown;
    preload?: unknown;
    [key: string]: unknown;
  }) => (
    <a
      href={to === "/user/$username" ? `/user/${params?.username ?? ""}` : to}
      {...props}
    >
      {children}
    </a>
  ),
  useLocation: ({
    select,
  }: {
    select: (location: { pathname: string; searchStr: string }) => unknown;
  }) => select({ pathname: "/", searchStr: "" }),
  useNavigate: () => vi.fn(),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: {
      id: 1,
      username: "emmanuel",
      email: "emmanuel@example.test",
      avatar_url: null,
    },
    isAuthenticated: true,
    logout,
  }),
}));

import { Navbar } from "@/components/layout/Navbar";

describe("navbar user menu", () => {
  it("links to settings from the profile menu", async () => {
    const user = userEvent.setup();
    render(<Navbar />);

    await user.click(
      screen.getByRole("button", { name: "Open @emmanuel menu" }),
    );

    expect(screen.getByRole("link", { name: "Settings" })).toHaveAttribute(
      "href",
      "/settings",
    );
  });

  it("activates nested links from a focused menu item", async () => {
    const user = userEvent.setup();
    render(<Navbar />);

    await user.click(
      screen.getByRole("button", { name: "Open @emmanuel menu" }),
    );

    const settingsLink = screen.getByRole("link", { name: "Settings" });
    const menuItem = settingsLink.closest('[role="menuitem"]');
    const click = vi.spyOn(settingsLink, "click").mockImplementation(() => {});

    expect(menuItem).not.toBeNull();
    (menuItem as HTMLElement).focus();
    await user.keyboard("{Enter}");

    expect(click).toHaveBeenCalledOnce();
    click.mockRestore();
  });
});
