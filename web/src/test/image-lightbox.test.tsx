import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { EpisodeCard } from "@/components/common/cards/EpisodeCard";
import { ImageLightbox, type ImageGalleryItem } from "@/components/common/media/ImageLightbox";
import { GallerySection } from "@/components/pages/ContentDetailPage/components/GallerySection";
import { ContentType, ImageSize, ImageType, type ContentItem, type MovieDetail, type TVEpisode } from "@/lib/types";

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
    } as MovieDetail;

    render(
      <GallerySection
        detailData={movie}
        contentItem={{ content_type: ContentType.MOVIE } as ContentItem}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Open Gallery Movie gallery image 1" }));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getAllByText("Gallery Movie")).toHaveLength(2);
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
