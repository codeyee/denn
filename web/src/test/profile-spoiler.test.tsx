import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children }: { children: ReactNode }) => <a href="/">{children}</a>,
}));

import { ReviewRow } from "@/components/pages/PublicProfilePage/ReviewRow";
import { ContentType } from "@/lib/types";

describe("public profile spoiler reviews", () => {
  it("keeps spoiler text hidden until an accessible reveal action", async () => {
    const user = userEvent.setup();
    render(
      <ReviewRow
        rating={{
          id: 1,
          content: {
            id: 42,
            type: ContentType.MOVIE,
            title: "The Reveal",
            subtitle: null,
            date: "2026-01-01",
            poster: null,
            backdrop: null,
          },
          score: "8.5",
          review: "The final scene changes everything.",
          spoiler: true,
          is_favorite: false,
          created_at: "2026-01-02T00:00:00Z",
          updated_at: "2026-01-02T00:00:00Z",
        }}
      />,
    );

    expect(
      screen.queryByText("The final scene changes everything."),
    ).not.toBeInTheDocument();
    const reveal = screen.getByRole("button", {
      name: "Reveal spoiler review",
    });
    expect(reveal).toHaveAttribute("aria-expanded", "false");

    await user.click(reveal);
    expect(
      screen.getByText("The final scene changes everything."),
    ).toBeInTheDocument();
  });
});
