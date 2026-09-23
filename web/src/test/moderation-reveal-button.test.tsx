import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ContentCard } from "@/components/common/cards/ContentCard";
import { ModerationRevealButton } from "@/components/common/cards/ContentCard/ModerationRevealButton";
import type { Content } from "@/lib/types";

vi.mock("@/hooks/useAuthRequiredAction", () => ({
  useAuthRequiredAction: () => vi.fn(),
}));

vi.mock("@/lib/api/queries/usePrefetchContentDetail", () => ({
  usePrefetchContentDetail: () => vi.fn(),
}));

vi.mock("@/lib/perf/useHoverPrefetch", () => ({
  useHoverPrefetch: () => ({}),
}));

vi.mock(
  "@/components/common/cards/ContentCard/hooks/useContentCardModal",
  () => ({
    useContentCardModal: () => ({
      isOpen: false,
      openModal: vi.fn(),
      closeModal: vi.fn(),
      contentItem: null,
    }),
  }),
);

const movie: Content = {
  id: "movie-42",
  denn_id: 42,
  type: "MOVIE",
  title: "Sensitive film",
  original_title: "Sensitive film",
  description: null,
  image_url: "/poster.jpg",
  tagline: null,
  imdb_id: null,
  release_date: null,
  duration_minutes: null,
  status: null,
  authors: null,
  images: [],
  platforms: null,
};

describe("ModerationRevealButton", () => {
  it("exposes a keyboard-operable pressed state and toggle action", async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    const { rerender } = render(
      <ModerationRevealButton isRevealed={false} onToggle={onToggle} />,
    );

    const revealButton = screen.getByRole("button", { name: "Reveal artwork" });
    expect(revealButton).toHaveAttribute("aria-pressed", "false");
    await user.tab();
    expect(revealButton).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(onToggle).toHaveBeenCalledOnce();

    rerender(<ModerationRevealButton isRevealed onToggle={onToggle} />);
    expect(screen.getByRole("button", { name: "Blur artwork" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("keeps an icon-only 44px hit target and stops card click propagation", async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    const onCardClick = vi.fn();

    render(
      <div onClick={onCardClick}>
        <ModerationRevealButton isRevealed={false} onToggle={onToggle} />
      </div>,
    );

    const button = screen.getByRole("button", { name: "Reveal artwork" });
    expect(button).toHaveClass("h-11", "w-11", "pointer-events-auto");
    expect(button).toHaveAttribute("title", "Reveal artwork");
    expect(button).toHaveTextContent(/^$/);

    await user.click(button);

    expect(onToggle).toHaveBeenCalledOnce();
    expect(onCardClick).not.toHaveBeenCalled();
  });

  it("stacks the reveal control below both top badge slots", async () => {
    const user = userEvent.setup();
    const onCardClick = vi.fn();
    const { container } = render(
      <div onClick={onCardClick}>
        <ContentCard
          item={movie}
          moderationSummary={{ status: "complete", classification: "explicit" }}
          leadingBadgeSlot={<span>Leading badge</span>}
          badgeSlot={<span>Rating badge</span>}
          showAddToList={false}
          disableDetailNavigation
        />
      </div>,
    );

    const button = screen.getByRole("button", { name: "Reveal artwork" });
    const controlStack = button.parentElement;
    expect(controlStack).toHaveClass("flex", "flex-col", "items-end");
    expect(controlStack?.children).toHaveLength(2);

    const badgeRow = controlStack?.children.item(0);
    if (!(badgeRow instanceof HTMLElement)) {
      throw new Error("Expected badge row before moderation reveal button");
    }
    expect(badgeRow).toHaveClass("justify-between");
    expect(within(badgeRow).getByText("Leading badge")).toBeVisible();
    expect(within(badgeRow).getByText("Rating badge")).toBeVisible();
    expect(controlStack?.children.item(1)).toBe(button);

    await user.click(button);

    expect(screen.getByRole("button", { name: "Blur artwork" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(onCardClick).not.toHaveBeenCalled();
    expect(container.querySelector("button")?.textContent).toBe("");
  });

  it("does not reveal artwork for a complete needs-review judgment", () => {
    render(
      <ContentCard
        item={movie}
        moderationSummary={{ status: "complete", classification: "needs_review" }}
        showAddToList={false}
        disableDetailNavigation
      />,
    );

    expect(
      screen.queryByRole("button", { name: "Reveal artwork" }),
    ).not.toBeInTheDocument();
  });
});
