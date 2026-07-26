import type { ReactNode } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    children,
    className,
    "aria-label": ariaLabel,
  }: {
    children: ReactNode;
    className?: string;
    "aria-label"?: string;
  }) => (
    <a href="/" aria-label={ariaLabel} className={className}>
      {children}
    </a>
  ),
}));

import { ReviewRow } from "@/components/pages/PublicProfilePage/ReviewRow";
import { ContentType } from "@/lib/types";

describe("public profile reviews", () => {
  it("shows review text directly even when the payload marks it as a spoiler", () => {
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
            poster: "https://example.com/the-reveal-cover.jpg",
            backdrop: "https://example.com/the-reveal-gallery.jpg",
            authors: null,
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
      screen.getByText("The final scene changes everything."),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /spoiler/i }),
    ).not.toBeInTheDocument();
    expect(screen.getByLabelText("Movie")).toBeInTheDocument();
    for (const artwork of screen.getAllByAltText("The Reveal artwork")) {
      expect(artwork).toHaveAttribute(
        "src",
        "https://example.com/the-reveal-cover.jpg",
      );
      expect(artwork).not.toHaveAttribute(
        "src",
        "https://example.com/the-reveal-gallery.jpg",
      );
    }
    expect(
      screen.getByLabelText("My Rating: 8.5 out of 10"),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("8.5 out of 10")).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Open The Reveal" }),
    ).toHaveClass("block");
  });

  it("offers the content link when a long review is visually truncated", async () => {
    const scrollHeight = Object.getOwnPropertyDescriptor(
      HTMLElement.prototype,
      "scrollHeight",
    );
    const clientHeight = Object.getOwnPropertyDescriptor(
      HTMLElement.prototype,
      "clientHeight",
    );
    Object.defineProperty(HTMLElement.prototype, "scrollHeight", {
      configurable: true,
      get: () => 120,
    });
    Object.defineProperty(HTMLElement.prototype, "clientHeight", {
      configurable: true,
      get: () => 60,
    });

    render(
      <ReviewRow
        rating={{
          id: 2,
          content: {
            id: 84,
            type: ContentType.GAME,
            title: "A Very Long Adventure",
            subtitle: null,
            date: "2026-01-01",
            poster: null,
            backdrop: null,
            authors: null,
          },
          score: "9.0",
          review: "A long review that needs more room than the card provides.",
          spoiler: false,
          is_favorite: true,
          created_at: "2026-01-02T00:00:00Z",
          updated_at: "2026-01-02T00:00:00Z",
        }}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("View more")).toBeInTheDocument();
    });
    expect(screen.getByText("View more")).toHaveClass(
      "absolute",
      "bottom-0",
      "right-0",
    );
    expect(
      screen.getByText(
        "A long review that needs more room than the card provides.",
      ),
    ).toHaveClass("pr-24", "whitespace-normal");
    expect(screen.getByLabelText("Game")).toBeInTheDocument();

    if (scrollHeight) {
      Object.defineProperty(HTMLElement.prototype, "scrollHeight", scrollHeight);
    }
    if (clientHeight) {
      Object.defineProperty(HTMLElement.prototype, "clientHeight", clientHeight);
    }
  });
});
