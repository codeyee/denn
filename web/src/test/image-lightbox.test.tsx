import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { EpisodeCard } from "@/components/common/cards/EpisodeCard";
import { ImageLightbox, type ImageGalleryItem } from "@/components/common/media/ImageLightbox";
import { GallerySection } from "@/components/pages/ContentDetailPage/components/GallerySection";
import { SeasonDetailContent } from "@/components/pages/ContentDetailPage/contents/SeasonDetailContent";
import { ContentType, ImageSize, ImageType, type ContentItem, type MovieDetail, type TVEpisode, type TVSeasonDetail } from "@/lib/types";

vi.mock("@/components/pages/ContentDetailPage/components/RatingsSection", () => ({
  RatingsSection: () => null,
}));

const galleryItems: ImageGalleryItem[] = [
  {
    src: "/gallery/first.jpg",
    alt: "First gallery image",
    title: "First image",
    metadata: "Season 1 · Episode 1 · Jan 1, 2026 · 45 min",
    description: "The first episode description.",
  },
  {
    src: "/gallery/second.jpg",
    alt: "Second gallery image",
    title: "Second image",
  },
];

function ControlledLightbox() {
  const [activeIndex, setActiveIndex] = useState<number | null>(0);

  return (
    <ImageLightbox
      items={galleryItems}
      activeIndex={activeIndex}
      isOpen={activeIndex !== null}
      onOpenChange={(open) => {
        if (!open) setActiveIndex(null);
      }}
      onIndexChange={setActiveIndex}
    />
  );
}

describe("ImageLightbox", () => {
  it("shows metadata and navigates between images", () => {
    render(<ControlledLightbox />);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getAllByText("First image")).toHaveLength(2);
    expect(screen.getByText("Season 1 · Episode 1 · Jan 1, 2026 · 45 min")).toBeInTheDocument();
    expect(screen.getByText("The first episode description.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Next image" }));

    expect(screen.getAllByText("Second image")).toHaveLength(2);
    expect(screen.getByText("2 / 2")).toBeInTheDocument();
  });

  it("wraps navigation at both ends of the gallery", () => {
    render(<ControlledLightbox />);

    fireEvent.click(screen.getByRole("button", { name: "Previous image" }));
    expect(screen.getAllByText("Second image")).toHaveLength(2);

    fireEvent.click(screen.getByRole("button", { name: "Next image" }));
    expect(screen.getAllByText("First image")).toHaveLength(2);

    fireEvent.click(screen.getByRole("button", { name: "Next image" }));
    expect(screen.getAllByText("Second image")).toHaveLength(2);
  });

  it("toggles zoom from the controls", () => {
    render(<ControlledLightbox />);

    fireEvent.click(screen.getByRole("button", { name: "Zoom in" }));

    expect(screen.getByRole("button", { name: "Zoom out" })).toBeInTheDocument();
  });

  it("allows metadata to be hidden without closing the gallery", () => {
    render(<ControlledLightbox />);

    fireEvent.click(screen.getByRole("button", { name: "Hide image metadata" }));

    expect(screen.queryByText("The first episode description.")).not.toBeInTheDocument();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Show image metadata" })).toBeInTheDocument();
  });
});

describe("content detail galleries", () => {
  it("opens a content gallery image from its thumbnail", () => {
    const movie = {
      type: "MOVIE",
      title: "Gallery Movie",
      images: [
        { type: ImageType.GALLERY, size: ImageSize.STANDARD, image_url: "/movie/first.jpg" },
      ],
    } as unknown as MovieDetail;

    render(
      <GallerySection
        detailData={movie}
        contentItem={{ content_type: ContentType.MOVIE } as ContentItem}
        allowAdultContent={false}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Open Gallery Movie gallery image 1" }));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getAllByText("Gallery Movie")).toHaveLength(2);
  });

  it("blurs explicit gallery art by default and reveals it locally", () => {
    const movie = {
      id: 42,
      type: "MOVIE",
      title: "Explicit Movie",
      images: [
        { type: ImageType.GALLERY, size: ImageSize.STANDARD, image_url: "/movie/explicit.jpg" },
      ],
    } as unknown as MovieDetail;
    const contentItem = {
      id: 42,
      content_type: ContentType.MOVIE,
      moderation: { status: "complete", classification: "explicit" },
    } as ContentItem;

    render(
      <GallerySection
        detailData={movie}
        contentItem={contentItem}
        allowAdultContent={false}
      />,
    );

    expect(screen.getByRole("img", { name: "Explicit Movie gallery image 1" })).toHaveClass("blur-md");
    fireEvent.click(screen.getByRole("button", { name: "Open Explicit Movie gallery image 1" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(
      screen.getAllByRole("img", { name: "Explicit Movie gallery image 1" }).every((image) => image.classList.contains("blur-md")),
    ).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Close gallery" }));
    fireEvent.click(screen.getByRole("button", { name: "Reveal artwork" }));
    expect(screen.getByRole("img", { name: "Explicit Movie gallery image 1" })).not.toHaveClass("blur-md");
    expect(screen.getByRole("button", { name: "Blur artwork" })).toHaveAttribute("aria-pressed", "true");
  });

  it("keeps explicit gallery art unblurred when adult content is allowed", () => {
    const movie = {
      id: 43,
      type: "MOVIE",
      title: "Opted-in Movie",
      images: [
        { type: ImageType.GALLERY, size: ImageSize.STANDARD, image_url: "/movie/opted-in.jpg" },
      ],
    } as unknown as MovieDetail;

    render(
      <GallerySection
        detailData={movie}
        contentItem={{
          id: 43,
          content_type: ContentType.MOVIE,
          moderation: { status: "complete", classification: "explicit" },
        } as ContentItem}
        allowAdultContent
      />,
    );

    expect(screen.getByRole("img", { name: "Opted-in Movie gallery image 1" })).not.toHaveClass("blur-md");
    expect(screen.queryByRole("button", { name: "Reveal artwork" })).not.toBeInTheDocument();
  });

  it("applies the current detail moderation to episode stills and their lightbox", () => {
    const season = {
      id: "season-5",
      episodes: [
        {
          id: "episode-1",
          episode_number: 1,
          season_number: 5,
          title: "Pilot",
          description: null,
          release_date: "2025-01-01",
          duration_minutes: 45,
          image_url: "/episodes/pilot.jpg",
        },
      ],
    } as TVSeasonDetail;

    render(
      <SeasonDetailContent
        season={season}
        contentItem={{
          id: 55,
          moderation: { status: "complete", classification: "explicit" },
        } as ContentItem}
      />,
    );

    expect(screen.getByRole("img", { name: "Pilot still" })).toHaveClass("blur-md");
    fireEvent.click(screen.getByRole("button", { name: "Open Pilot in gallery" }));
    expect(screen.getAllByRole("img", { name: "Pilot still" }).every((image) => image.classList.contains("blur-md"))).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Close gallery" }));
    fireEvent.click(screen.getByRole("button", { name: "Reveal artwork" }));
    expect(screen.getByRole("img", { name: "Pilot still" })).not.toHaveClass("blur-md");
    fireEvent.click(screen.getByRole("button", { name: "Open Pilot in gallery" }));
    expect(screen.getAllByRole("img", { name: "Pilot still" }).every((image) => !image.classList.contains("blur-md"))).toBe(true);
  });
});

describe("episode gallery entry point", () => {
  it("makes episodes with artwork openable", () => {
    const onOpenGallery = vi.fn();
    const episode: TVEpisode = {
      id: "episode-1",
      episode_number: 1,
      season_number: 1,
      episode_type: null,
      title: "The Pilot",
      description: null,
      release_date: "2026-01-01",
      duration_minutes: 45,
      image_url: "/episodes/pilot.jpg",
    };

    render(<EpisodeCard episode={episode} onOpenGallery={onOpenGallery} />);

    fireEvent.click(screen.getByRole("button", { name: "Open The Pilot in gallery" }));

    expect(onOpenGallery).toHaveBeenCalledOnce();
  });
});
