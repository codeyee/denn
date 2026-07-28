import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ContainedPosterBannerMedia } from "@/components/common/media/ContainedPosterBannerMedia";
import { getBestBannerMedia } from "@/components/pages/HomePage/FeaturedBanner/utils";
import { ImageSize, ImageType, type Image } from "@/lib/types";
import { getBannerMedia } from "@/lib/utils/imageUtils";

function image(type: string, size: ImageSize, imageUrl: string): Image {
  return {
    type,
    size,
    image_url: imageUrl,
  } as Image;
}

describe("content banner media selection", () => {
  it("prioritizes banner-specific and horizontal media over the poster", () => {
    const images = [
      image(ImageType.POSTER, ImageSize.ORIGINAL, "poster.jpg"),
      image(ImageType.GALLERY, ImageSize.ORIGINAL, "gallery.jpg"),
      image("backdrop", ImageSize.ORIGINAL, "backdrop.jpg"),
      image("banner", ImageSize.ORIGINAL, "banner.jpg"),
    ];

    expect(getBannerMedia(images, "fallback.jpg")).toEqual({
      imageUrl: "banner.jpg",
      treatment: "cover",
    });
  });

  it("uses current gallery payloads as horizontal banner media", () => {
    const images = [
      image(ImageType.POSTER, ImageSize.ORIGINAL, "poster.jpg"),
      image(ImageType.GALLERY, ImageSize.STANDARD, "gallery-standard.jpg"),
      image(ImageType.GALLERY, ImageSize.ORIGINAL, "gallery-original.jpg"),
    ];

    expect(getBannerMedia(images)).toEqual({
      imageUrl: "gallery-original.jpg",
      treatment: "cover",
    });
  });

  it("marks a lone poster for the contained fallback treatment", () => {
    const images = [
      image(ImageType.POSTER, ImageSize.STANDARD, "poster-standard.jpg"),
      image(ImageType.POSTER, ImageSize.ORIGINAL, "poster-original.jpg"),
    ];

    expect(getBannerMedia(images)).toEqual({
      imageUrl: "poster-original.jpg",
      treatment: "contained-poster",
    });
    expect(getBannerMedia([], "legacy-poster.jpg")).toEqual({
      imageUrl: "legacy-poster.jpg",
      treatment: "contained-poster",
    });
  });

  it("keeps homepage selection aligned with the detail banner treatment", () => {
    const album = {
      type: "ALBUM",
      image_url: "album-poster.jpg",
      images: [image(ImageType.POSTER, ImageSize.ORIGINAL, "album-poster.jpg")],
    } as Parameters<typeof getBestBannerMedia>[0];

    expect(getBestBannerMedia(album)).toEqual({
      imageUrl: "album-poster.jpg",
      treatment: "contained-poster",
    });
  });
});

describe("contained poster banner media", () => {
  it("renders a complete foreground cover over an ambient blurred copy", () => {
    const { container } = render(
      <ContainedPosterBannerMedia
        src="cover.jpg"
        alt="Night Owl artwork"
        priority
      />,
    );

    const foreground = screen.getByAltText("Night Owl artwork");
    const ambient = container.querySelector('img[aria-hidden="true"]');
    const foregroundArea = container.querySelector("[data-banner-foreground]");

    expect(container.firstChild).toHaveAttribute(
      "data-banner-media",
      "contained-poster",
    );
    expect(foreground).toHaveClass("object-contain");
    expect(foregroundArea).toHaveClass("justify-center");
    expect(ambient).toHaveClass("object-cover", "blur-md", "brightness-125");
  });
});
