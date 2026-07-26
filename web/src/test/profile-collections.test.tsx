import type { ReactNode } from "react";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { formatAuthors } from "@/lib/utils/authorUtils";

vi.mock("@/components/common/cards/ContentCard", () => ({
  ContentCard: ({
    item,
    leadingBadgeSlot,
    badgeSlot,
    metadataSlot,
    footerSlot,
  }: {
    item: {
      title: string;
      authors?: Array<{ name: string } | string> | null;
    };
    leadingBadgeSlot?: ReactNode;
    badgeSlot?: ReactNode;
    metadataSlot?: ReactNode;
    footerSlot?: ReactNode;
  }) => (
    <article data-testid={`content-card-${item.title}`}>
      <div data-testid="card-leading-badge">{leadingBadgeSlot}</div>
      <div data-testid="card-badges">{badgeSlot}</div>
      <div data-testid="card-metadata">
        {metadataSlot ??
          formatAuthors(
            item.authors as Parameters<typeof formatAuthors>[0],
            2,
          )}
      </div>
      {footerSlot ? <div data-testid="outside-footer">{footerSlot}</div> : null}
    </article>
  ),
}));

import {
  CompletedGrid,
  FavoriteGrid,
} from "@/components/pages/PublicProfilePage/ProfileCollections";
import { AuthorType, ContentType, type LocalContentSummary } from "@/lib/types";

const content: LocalContentSummary = {
  id: 42,
  type: ContentType.GAME,
  title: "Night Drive",
  subtitle: null,
  date: "2020-06-10",
  poster: null,
  backdrop: null,
  authors: [
    { name: "Studio One", type: AuthorType.COMPANY },
    { name: "Studio Two", type: AuthorType.COMPANY },
    { name: "Studio Three", type: AuthorType.COMPANY },
  ],
};

describe("public profile content collections", () => {
  it("places the rating left and the favorite star right", () => {
    render(
      <FavoriteGrid
        items={[{ content, favorited_at: "2026-01-01", score: "8.5" }]}
      />,
    );

    const card = screen.getByTestId("content-card-Night Drive");
    const leadingBadge = within(card).getByTestId("card-leading-badge");
    const badges = within(card).getByTestId("card-badges");
    expect(within(badges).getByLabelText("Favorite")).toBeInTheDocument();
    expect(within(leadingBadge).getByText("8.5")).toBeInTheDocument();
    expect(within(badges).queryByText("8.5")).not.toBeInTheDocument();
    expect(
      within(card).getByText("Studio One, Studio Two & 1 more"),
    ).toBeInTheDocument();
    expect(within(card).queryByTestId("outside-footer")).not.toBeInTheDocument();
  });

  it("replaces release metadata with authors and the completion date", () => {
    render(
      <CompletedGrid
        items={[
          {
            content,
            completed_at: "2026-02-03T00:00:00Z",
            is_favorite: true,
            score: "9.0",
          },
        ]}
      />,
    );

    const card = screen.getByTestId("content-card-Night Drive");
    const metadata = within(card).getByTestId("card-metadata");
    expect(
      within(metadata).getByText("Studio One, Studio Two & 1 more"),
    ).toBeInTheDocument();
    expect(
      within(metadata).getByText("Completed Feb 3, 2026"),
    ).toBeInTheDocument();
    expect(within(metadata).queryByText(/2020/)).not.toBeInTheDocument();
    expect(within(card).queryByTestId("outside-footer")).not.toBeInTheDocument();
  });
});
