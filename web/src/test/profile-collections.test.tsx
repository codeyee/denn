import type { ReactNode } from "react";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { formatAuthors } from "@/lib/utils/authorUtils";

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    children,
    params,
    hash,
    ...props
  }: {
    children: ReactNode;
    params?: { id?: string };
    hash?: string;
    [key: string]: unknown;
  }) => (
    <a
      href={`/content/${params?.id ?? ""}${hash ? `#${hash}` : ""}`}
      {...props}
    >
      {children}
    </a>
  ),
}));

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

vi.mock("@/components/common/cards/ListCard", () => ({
  ListCard: ({
    list,
    footerSlot,
  }: {
    list: { name: string };
    footerSlot?: ReactNode;
  }) => (
    <article data-testid={`list-card-${list.name}`}>
      {list.name}
      {footerSlot ? <div data-testid="outside-footer">{footerSlot}</div> : null}
    </article>
  ),
}));

import {
  CompletedGrid,
  PublicListGrid,
} from "@/components/pages/PublicProfilePage/ProfileCollections";
import { ProgressCollection } from "@/components/pages/PublicProfilePage/ProgressCollection";
import {
  AuthorType,
  ContentType,
  ListType,
  type LocalContentSummary,
  type PublicListSummary,
} from "@/lib/types";

const content: LocalContentSummary = {
  id: 42,
  type: ContentType.GAME,
  season_number: null,
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
  it("uses compact indicators instead of orphaned review text in grid view", () => {
    render(
      <ProgressCollection
        view="grid"
        items={[
          {
            id: 7,
            content,
            status: "completed",
            completed_at: "2026-01-01T00:00:00Z",
            is_favorite: true,
            rating: {
              id: 8,
              score: "8.5",
              review: "A neon road worth revisiting.",
              spoiler: false,
              created_at: "2026-01-01T00:00:00Z",
              updated_at: "2026-01-02T00:00:00Z",
            },
            created_at: "2026-01-01T00:00:00Z",
            updated_at: "2026-01-02T00:00:00Z",
          },
        ]}
      />,
    );

    const card = screen.getByTestId("content-card-Night Drive");
    const leadingBadge = within(card).getByTestId("card-leading-badge");
    const badges = within(card).getByTestId("card-badges");
    const indicators = within(badges).getByRole("group", {
      name: "Content indicators",
    });
    const rating = within(indicators).getByRole("img", {
      name: "My Rating: 8.5 out of 10",
    });
    const review = within(indicators).getByRole("link", {
      name: "Open review for Night Drive",
    });
    const favorite = within(indicators).getByLabelText("Favorite");
    expect(leadingBadge).toBeEmptyDOMElement();
    expect(indicators.children[0]).toContainElement(rating);
    expect(indicators.children[1]).toContainElement(review);
    expect(indicators.children[2]).toContainElement(favorite);
    expect(
      within(card).getByText("Studio One, Studio Two & 1 more"),
    ).toBeInTheDocument();
    expect(
      within(card).queryByText("A neon road worth revisiting."),
    ).not.toBeInTheDocument();
    expect(review).toHaveAttribute("href", "/content/42#ratings");
  });

  it("shows review and progress metadata in list view", () => {
    render(
      <ProgressCollection
        view="list"
        items={[
          {
            id: 7,
            content,
            status: "completed",
            completed_at: "2026-01-01T00:00:00Z",
            is_favorite: true,
            rating: {
              id: 8,
              score: "8.5",
              review: "A neon road worth revisiting.",
              spoiler: false,
              created_at: "2026-01-01T00:00:00Z",
              updated_at: "2026-01-02T00:00:00Z",
            },
            created_at: "2026-01-01T00:00:00Z",
            updated_at: "2026-01-02T00:00:00Z",
          },
        ]}
      />,
    );

    expect(
      screen.getByText("A neon road worth revisiting."),
    ).toBeInTheDocument();
    expect(screen.getByText("Completed Jan 1, 2026")).toBeInTheDocument();
    expect(screen.getByText("Released Jun 10, 2020")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Open review for Night Drive" }),
    ).toHaveAttribute("href", "/content/42#ratings");
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
    const leadingBadge = within(card).getByTestId("card-leading-badge");
    const indicators = within(card).getByRole("group", {
      name: "Content indicators",
    });
    const metadata = within(card).getByTestId("card-metadata");
    const rating = within(indicators).getByRole("img", {
      name: "My Rating: 9.0 out of 10",
    });
    const favorite = within(indicators).getByLabelText("Favorite");
    expect(leadingBadge).toBeEmptyDOMElement();
    expect(indicators.children[0]).toContainElement(rating);
    expect(indicators.children[1]).toContainElement(favorite);
    expect(
      within(metadata).getByText("Studio One, Studio Two & 1 more"),
    ).toBeInTheDocument();
    expect(
      within(metadata).getByText("Completed Feb 3, 2026"),
    ).toBeInTheDocument();
    expect(within(metadata).queryByText(/2020/)).not.toBeInTheDocument();
    expect(within(card).queryByTestId("outside-footer")).not.toBeInTheDocument();
  });

  it("keeps public list cards compact and does not render descriptions outside them", () => {
    const list: PublicListSummary = {
      id: 11,
      name: "Weekend queue",
      description: "Titles to watch this weekend.",
      list_type: ListType.PERSONAL,
      visibility: "PUBLIC",
      role: "owner",
      owner: { username: "reader" },
      collaborators: [],
      item_count: 4,
      member_count: 1,
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-02T00:00:00Z",
    };

    render(<PublicListGrid lists={[list]} />);

    const card = screen.getByTestId("list-card-Weekend queue");
    expect(card).toBeInTheDocument();
    expect(screen.queryByText(list.description)).not.toBeInTheDocument();
    expect(screen.queryByTestId("outside-footer")).not.toBeInTheDocument();
    expect(card.parentElement).toHaveClass("xl:grid-cols-6");
  });

  it("does not repeat the series title as season attribution", () => {
    const seasonContent: LocalContentSummary = {
      ...content,
      id: 62,
      type: ContentType.SEASON,
      season_number: 1,
      title: "Unwavering Resolve Arc",
      subtitle: "Demon Slayer: Kimetsu no Yaiba",
      authors: null,
    };

    render(
      <ProgressCollection
        view="grid"
        items={[
          {
            id: 62,
            content: seasonContent,
            status: "completed",
            completed_at: "2026-01-01T00:00:00Z",
            is_favorite: false,
            rating: null,
            created_at: "2026-01-01T00:00:00Z",
            updated_at: "2026-01-02T00:00:00Z",
          },
        ]}
      />,
    );

    const card = screen.getByTestId(
      "content-card-Unwavering Resolve Arc",
    );
    const metadata = within(card).getByTestId("card-metadata");
    expect(metadata).not.toHaveTextContent(
      "Demon Slayer: Kimetsu no Yaiba",
    );
    expect(metadata).toHaveTextContent("Completed · Jan 2, 2026");
  });
});
