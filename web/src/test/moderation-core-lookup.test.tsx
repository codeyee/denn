import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ useContentDetailQuery: vi.fn() }));

vi.mock("@/lib/api/queries/useContentDetailQuery", () => ({
  useContentDetailQuery: mocks.useContentDetailQuery,
}));

vi.mock("@/components/common/cards/ContentCard", () => ({
  ContentCard: ({
    item,
    moderationSummary,
    badgeSlot,
  }: {
    item: { title: string };
    moderationSummary?: { status: string; classification: string | null };
    badgeSlot?: ReactNode;
  }) => (
    <article data-testid="core-preview-card">
      <h3>{item.title}</h3>
      <span data-testid="summary-shape">
        {moderationSummary?.status}:{moderationSummary?.classification}
      </span>
      {badgeSlot}
    </article>
  ),
}));

import { ModerationCoreItemLookup } from "@/components/pages/ModerationCoreItemLookup";
import { useContentDetailQuery } from "@/lib/api/queries/useContentDetailQuery";
import {
  ContentType,
  SourceApi,
  type ContentItem,
  type MovieDetail,
} from "@/lib/types";

const sourceData: MovieDetail = {
  id: "movie-42",
  type: "MOVIE",
  title: "Local Core Example",
  original_title: "Local Core Example",
  description: "A local persisted item.",
  image_url: "/moderation-preview-artwork.svg",
  tagline: null,
  imdb_id: null,
  release_date: null,
  duration_minutes: null,
  status: null,
  authors: null,
  images: [],
  platforms: null,
};

const coreItem: ContentItem = {
  id: 42,
  source_api: SourceApi.TMDB,
  external_id: "movie-42",
  content_type: ContentType.MOVIE,
  rating_count: 0,
  average_rating: null,
  current_user_rating: null,
  current_user_tracking: null,
  progress_policy: {
    content_type: ContentType.MOVIE,
    final_status: "completed",
    states: [],
  },
  created_at: "2026-09-22T00:00:00Z",
  source_data: sourceData,
  moderation: { status: "complete", classification: "explicit" },
};

describe("ModerationCoreItemLookup", () => {
  beforeEach(() => {
    vi.mocked(useContentDetailQuery).mockClear();
    vi.mocked(useContentDetailQuery).mockReturnValue({
      data: coreItem,
      isPending: false,
      isError: false,
    } as ReturnType<typeof useContentDetailQuery>);
  });

  it("loads the selected ID through one existing Core detail query", async () => {
    const user = userEvent.setup();
    render(<ModerationCoreItemLookup country="CO" />);

    await user.type(screen.getByLabelText("ContentItem ID"), "42");
    await user.click(screen.getByRole("button", { name: "Load Core item" }));

    const queriedIds = vi
      .mocked(useContentDetailQuery)
      .mock.calls.map(([id]) => id)
      .filter((id) => id > 0);
    expect(queriedIds).toEqual([42]);
    expect(useContentDetailQuery).toHaveBeenLastCalledWith(42, "CO");
    expect(screen.getByText("Core API · Complete · explicit")).toBeInTheDocument();
    expect(screen.getByTestId("summary-shape")).toHaveTextContent("complete:explicit");
  });
});
