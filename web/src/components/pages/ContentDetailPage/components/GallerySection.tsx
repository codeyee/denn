import { useState } from "react";
import {
  MovieDetail,
  TVShowDetail,
  GameDetail,
  ContentItem,
  ContentType,
  ImageType,
  ImageSize,
  AlbumDetail,
  BookDetail,
  TVSeasonDetail
} from "@/lib/types";
import {
  ImageLightbox,
  type ImageGalleryItem,
} from "@/components/common/media/ImageLightbox";

interface GallerySectionProps {
  detailData: MovieDetail | TVShowDetail | AlbumDetail | GameDetail | BookDetail | TVSeasonDetail | null;
  contentItem: ContentItem;
}

export function GallerySection({ detailData, contentItem }: GallerySectionProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  if (!detailData) return null;

  const contentType = contentItem.content_type;

  if (contentType === ContentType.SEASON) return null;

  const galleryImages = extractGalleryImages(detailData, contentType);

  if (galleryImages.length === 0) return null;

  const lightboxItems: ImageGalleryItem[] = galleryImages.map((image) => ({
    ...image,
    title: image.title,
  }));

  return (
    <div className="layout-content mt-8">
      <h2 className="text-2xl font-bold text-white mb-6">Gallery</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
        {galleryImages.map((image, index) => (
          <button
            type="button"
            key={index}
            onClick={() => setActiveIndex(index)}
            aria-label={`Open ${image.title} gallery image ${index + 1}`}
            className="group relative block w-full cursor-pointer overflow-hidden rounded-2xl text-left outline-none transition-transform duration-300 hover:scale-[1.02] focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <div className="relative overflow-hidden rounded-2xl" style={{ aspectRatio: "16 / 9" }}>
              <img
                src={image.src}
                alt={image.alt}
                loading="lazy"
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
            </div>
          </button>
        ))}
      </div>

      <ImageLightbox
        items={lightboxItems}
        activeIndex={activeIndex}
        isOpen={activeIndex !== null}
        onOpenChange={(open) => {
          if (!open) setActiveIndex(null);
        }}
        onIndexChange={setActiveIndex}
      />
    </div>
  );
}

function extractGalleryImages(
  detailData: MovieDetail | TVShowDetail | AlbumDetail | GameDetail | BookDetail | TVSeasonDetail,
  contentType: ContentType
): { src: string; alt: string; title: string }[] {
  const typesWithGallery = [ContentType.MOVIE, ContentType.TV_SHOW, ContentType.GAME];
  if (!typesWithGallery.includes(contentType)) return [];

  const data = detailData as MovieDetail | TVShowDetail | GameDetail;
  if (!data.images) return [];

  return Array.from(
    new Map(
      data.images
        .filter(img => img.type === ImageType.GALLERY && img.size === ImageSize.STANDARD)
        .map(img => [img.image_url, img])
    ).values()
  ).map((img, index) => ({
    src: img.image_url,
    alt: `${data.title} gallery image ${index + 1}`,
    title: data.title,
  }));
}
