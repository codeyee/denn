import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ContentBanner } from "@/components/pages/ContentDetailPage/components/ContentBanner";
import { ContentType, type MovieDetail, type ProgressPolicy } from "@/lib/types";

vi.mock("@/components/pages/ContentDetailPage/components/ContentActions", () => ({
  ContentActions: () => null,
}));

const item = {
  id: "movie-42",
  type: "MOVIE",
  title: "Explicit Film",
  image_url: "/movie/banner.jpg",
  images: [],
} as unknown as MovieDetail;

function renderBanner(allowAdultContent: boolean) {
  return render(
    <ContentBanner
      item={item}
      tracking={null}
      progressPolicy={{
        content_type: ContentType.MOVIE,
        final_status: "completed",
        states: [],
      } as ProgressPolicy}
      isTrackingLoading={false}
      onTrackingStatusChange={vi.fn()}
      onFavoriteChange={vi.fn()}
      onDeleteTracking={vi.fn()}
      moderationSummary={{ status: "complete", classification: "explicit" }}
      allowAdultContent={allowAdultContent}
    />,
  );
}

describe("detail banner moderation artwork", () => {
  it("blurs explicit artwork by default and supports local reveal", () => {
    renderBanner(false);

    const bannerArtwork = screen.getByRole("img", { name: "Explicit Film artwork" });
    expect(bannerArtwork).toHaveClass("blur-md");
    expect(screen.getByRole("button", { name: "Reveal artwork" })).toHaveClass(
      "h-11",
      "w-11",
    );

    fireEvent.click(screen.getByRole("button", { name: "Reveal artwork" }));
    expect(screen.getByRole("img", { name: "Explicit Film artwork" })).not.toHaveClass(
      "blur-md",
    );
    expect(screen.getByRole("button", { name: "Blur artwork" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("does not blur explicit artwork when the preference allows it", () => {
    renderBanner(true);

    expect(screen.getByRole("img", { name: "Explicit Film artwork" })).not.toHaveClass(
      "blur-md",
    );
    expect(screen.queryByRole("button", { name: "Reveal artwork" })).not.toBeInTheDocument();
  });
});
