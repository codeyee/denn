import type { ReactNode } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ContentCard } from "@/components/common/cards/ContentCard";
import { ModerationPresentationProvider } from "@/components/common/providers/ModerationPresentationProvider";
import { FavoriteGrid } from "@/components/pages/PublicProfilePage/ProfileCollections";
import { ProgressCollection } from "@/components/pages/PublicProfilePage/ProgressCollection";
import {
  ContentType,
  type Content,
  type LocalContentSummary,
  type ModerationSummary,
} from "@/lib/types";

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    children,
    params,
    ...props
  }: {
    children?: ReactNode;
    params?: { id?: string };
    [key: string]: unknown;
  }) => (
    <a href={`/content/${params?.id ?? ""}`} {...props}>
      {children}
    </a>
  ),
}));

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

const EXPLICIT: ModerationSummary = { status: "complete", classification: "explicit" };
const NEEDS_REVIEW: ModerationSummary = { status: "complete", classification: "needs_review" };

function movie(moderation?: ModerationSummary): Content {
  return {
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
    ...(moderation ? { moderation } : {}),
  };
}

function renderCard(
  item: Content,
  presentation: { visibilityEnabled: boolean; allowAdultContent: boolean } | null,
) {
  const card = <ContentCard item={item} showAddToList={false} />;
  return render(
    presentation ? (
      <ModerationPresentationProvider {...presentation}>{card}</ModerationPresentationProvider>
    ) : (
      card
    ),
  );
}

const artwork = () => screen.getByRole("img", { name: "Sensitive film cover image" });
const revealButton = () => screen.queryByRole("button", { name: "Reveal artwork" });

describe("content card moderation artwork", () => {
  it("blurs current explicit artwork and offers a reveal when visibility is on", () => {
    renderCard(movie(EXPLICIT), { visibilityEnabled: true, allowAdultContent: false });

    expect(artwork()).toHaveClass("blur-md");
    expect(revealButton()).toBeInTheDocument();
  });

  it("never blurs when the server visibility flag is off", () => {
    renderCard(movie(EXPLICIT), { visibilityEnabled: false, allowAdultContent: false });

    expect(artwork()).not.toHaveClass("blur-md");
    expect(revealButton()).not.toBeInTheDocument();
  });

  it("never blurs without a provider", () => {
    renderCard(movie(EXPLICIT), null);

    expect(artwork()).not.toHaveClass("blur-md");
    expect(revealButton()).not.toBeInTheDocument();
  });

  it("does not blur for a viewer who opted in to adult content", () => {
    renderCard(movie(EXPLICIT), { visibilityEnabled: true, allowAdultContent: true });

    expect(artwork()).not.toHaveClass("blur-md");
    expect(revealButton()).not.toBeInTheDocument();
  });

  it("does not blur needs_review, unresolved, or missing summaries", () => {
    for (const moderation of [NEEDS_REVIEW, undefined]) {
      const { unmount } = renderCard(movie(moderation), {
        visibilityEnabled: true,
        allowAdultContent: false,
      });
      expect(artwork()).not.toHaveClass("blur-md");
      expect(revealButton()).not.toBeInTheDocument();
      unmount();
    }
  });

  it("reveals locally without navigating the card", () => {
    const onCardClick = vi.fn();
    render(
      <ModerationPresentationProvider visibilityEnabled allowAdultContent={false}>
        <div onClick={onCardClick}>
          <ContentCard item={movie(EXPLICIT)} showAddToList={false} />
        </div>
      </ModerationPresentationProvider>,
    );

    const button = screen.getByRole("button", { name: "Reveal artwork" });
    const notPrevented = fireEvent.click(button);

    expect(notPrevented).toBe(false);
    expect(onCardClick).not.toHaveBeenCalled();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(artwork()).not.toHaveClass("blur-md");
    expect(screen.getByRole("button", { name: "Blur artwork" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });
});

describe("Core-backed profile surfaces", () => {
  // Parsed JSON stands in for the raw Core payload, including invalid shapes.
  const favorite = (moderation: unknown) => {
    const content: LocalContentSummary = JSON.parse(
      JSON.stringify({
        id: 42,
        type: ContentType.MOVIE,
        season_number: null,
        title: "Sensitive film",
        subtitle: null,
        date: null,
        poster: "/poster.jpg",
        backdrop: null,
        authors: null,
        moderation,
      }),
    );
    return { content, favorited_at: null, score: null };
  };

  it("blurs a favorite whose Core summary is current explicit", () => {
    render(
      <ModerationPresentationProvider visibilityEnabled allowAdultContent={false}>
        <FavoriteGrid items={[favorite(EXPLICIT)]} />
      </ModerationPresentationProvider>,
    );

    expect(artwork()).toHaveClass("blur-md");
    expect(revealButton()).toBeInTheDocument();
  });

  it("ignores malformed summaries and the disabled flag", () => {
    const { unmount } = render(
      <ModerationPresentationProvider visibilityEnabled allowAdultContent={false}>
        <FavoriteGrid items={[favorite({ status: "complete", classification: "adult" })]} />
      </ModerationPresentationProvider>,
    );
    expect(artwork()).not.toHaveClass("blur-md");
    unmount();

    render(
      <ModerationPresentationProvider visibilityEnabled={false} allowAdultContent={false}>
        <FavoriteGrid items={[favorite(EXPLICIT)]} />
      </ModerationPresentationProvider>,
    );
    expect(artwork()).not.toHaveClass("blur-md");
  });
});

describe("Core-backed row artwork", () => {
  const progressItem = (moderation: ModerationSummary) => ({
    id: 7,
    content: {
      id: 42,
      type: ContentType.MOVIE,
      season_number: null,
      title: "Sensitive film",
      subtitle: null,
      date: null,
      poster: "/poster.jpg",
      backdrop: null,
      authors: null,
      moderation,
    },
    status: "completed" as const,
    completed_at: null,
    is_favorite: false,
    rating: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-02T00:00:00Z",
  });

  it("blurs both responsive images of an explicit progress row", () => {
    render(
      <ModerationPresentationProvider visibilityEnabled allowAdultContent={false}>
        <ProgressCollection view="list" items={[progressItem(EXPLICIT)]} />
      </ModerationPresentationProvider>,
    );

    const images = screen.getAllByRole("img", { name: "Sensitive film artwork" });
    expect(images).toHaveLength(2);
    for (const image of images) expect(image).toHaveClass("blur-md");
  });

  it("leaves the row unblurred for opted-in viewers", () => {
    render(
      <ModerationPresentationProvider visibilityEnabled allowAdultContent>
        <ProgressCollection view="list" items={[progressItem(EXPLICIT)]} />
      </ModerationPresentationProvider>,
    );

    for (const image of screen.getAllByRole("img", { name: "Sensitive film artwork" })) {
      expect(image).not.toHaveClass("blur-md");
    }
  });
});
