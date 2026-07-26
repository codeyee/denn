import type { ReactNode } from "react";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/common/cards/ContentCard", () => ({
  ContentCard: ({
    item,
    badgeSlot,
    metadataSlot,
    footerSlot,
  }: {
    item: { title: string };
    badgeSlot?: ReactNode;
    metadataSlot?: ReactNode;
    footerSlot?: ReactNode;
  }) => (
    <article data-testid={`content-card-${item.title}`}>
      <div data-testid="card-badges">{badgeSlot}</div>
      <div data-testid="card-metadata">{metadataSlot}</div>
      {footerSlot ? <div data-testid="outside-footer">{footerSlot}</div> : null}
    </article>
  ),
}));

import {
  CompletedGrid,
  FavoriteGrid,
} from "@/components/pages/PublicProfilePage/ProfileCollections";
import { ContentType } from "@/lib/types";

const content = {
  id: 42,
  type: ContentType.ALBUM,
  title: "Night Drive",
  subtitle: "The Artists",
  date: "2020-06-10",
  poster: null,
  backdrop: null,
};

describe("public profile content collections", () => {
  it("keeps favorite and rating badges together inside the card", () => {
    render(
      <FavoriteGrid
        items={[{ content, favorited_at: "2026-01-01", score: "8.5" }]}
      />,
    );

    const card = screen.getByTestId("content-card-Night Drive");
    const badges = within(card).getByTestId("card-badges");
    expect(within(badges).getByLabelText("Favorite")).toBeInTheDocument();
    expect(within(badges).getByText("8.5")).toBeInTheDocument();
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
    expect(within(metadata).getByText("The Artists")).toBeInTheDocument();
    expect(
      within(metadata).getByText("Completed Feb 3, 2026"),
    ).toBeInTheDocument();
    expect(within(metadata).queryByText(/2020/)).not.toBeInTheDocument();
    expect(within(card).queryByTestId("outside-footer")).not.toBeInTheDocument();
  });
});
