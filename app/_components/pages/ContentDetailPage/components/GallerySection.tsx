import Image from "next/image";
import {
  MovieDetail,
  TVShowDetail,
  GameDetail,
  ContentItem,
  ContentType,
  ImageType,
  AlbumDetail,
  BookDetail,
  TVSeasonDetail
} from "@/lib/types";

interface GallerySectionProps {
  detailData: MovieDetail | TVShowDetail | AlbumDetail | GameDetail | BookDetail | TVSeasonDetail | null;
  contentItem: ContentItem;
}

export function GallerySection({ detailData, contentItem }: GallerySectionProps) {
  if (!detailData) return null;

  const contentType = contentItem.content_type;

  if (contentType === ContentType.SEASON) return null;

  const galleryImages = extractGalleryImages(detailData, contentType);

  if (galleryImages.length === 0) return null;

  return (
    <div className="container mx-auto px-4 mt-8">
      <h2 className="text-2xl font-bold text-white mb-6">Gallery</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
        {galleryImages.map((image, index) => (
          <div
            key={index}
            className="relative overflow-hidden rounded-2xl"
            style={{ aspectRatio: "16 / 9" }}
          >
            <Image
              src={image.src}
              alt={image.alt}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function extractGalleryImages(
  detailData: MovieDetail | TVShowDetail | AlbumDetail | GameDetail | BookDetail | TVSeasonDetail,
  contentType: ContentType
): { src: string; alt: string }[] {
  let title = "";
  let images: { src: string; alt: string }[] = [];

  if (contentType === ContentType.MOVIE) {
    const movie = detailData as MovieDetail;
    title = movie.title;
    images = movie.images
      ? Array.from(
          new Map(
            movie.images
              .filter(img => img.type === ImageType.GALLERY && img.size === "STANDARD")
              .map(img => [img.image_url, img])
          ).values()
        ).map((img, index) => ({
          src: img.image_url,
          alt: `${title} gallery image ${index + 1}`,
        }))
      : [];
  } else if (contentType === ContentType.TV_SHOW) {
    const tvShow = detailData as TVShowDetail;
    title = tvShow.title;
    images = tvShow.images
      ? Array.from(
          new Map(
            tvShow.images
              .filter(img => img.type === ImageType.GALLERY && img.size === "STANDARD")
              .map(img => [img.image_url, img])
          ).values()
        ).map((img, index) => ({
          src: img.image_url,
          alt: `${title} gallery image ${index + 1}`,
        }))
      : [];
  } else if (contentType === ContentType.GAME) {
    const game = detailData as GameDetail;
    title = game.title;
    images = game.images
      ? Array.from(
          new Map(
            game.images
              .filter(img => img.type === ImageType.GALLERY && img.size === "STANDARD")
              .map(img => [img.image_url, img])
          ).values()
        ).map((img, index) => ({
          src: img.image_url,
          alt: `${title} gallery image ${index + 1}`,
        }))
      : [];
  }

  return images;
}
