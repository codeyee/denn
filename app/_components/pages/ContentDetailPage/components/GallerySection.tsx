import Image from "next/image";
import {
  MovieDetail,
  TVShowDetail,
  GameDetail,
  ContentItem,
  ContentType,
  ImageType,
  TVSeasonDetail,
  AlbumDetail,
  BookDetail
} from "@/lib/api/types";

type DetailData = MovieDetail | TVShowDetail | TVSeasonDetail | AlbumDetail | GameDetail | BookDetail | null;

interface GallerySectionProps {
  detailData: DetailData;
  contentItem: ContentItem;
}

function isMovieDetail(data: DetailData): data is MovieDetail {
  return data !== null && 'type' in data && data.type === 'MOVIE';
}

function isTVShowDetail(data: DetailData): data is TVShowDetail {
  return data !== null && 'type' in data && data.type === 'TV_SHOW';
}

function isGameDetail(data: DetailData): data is GameDetail {
  return data !== null && 'type' in data && data.type === 'GAME';
}

export function GallerySection({ detailData, contentItem }: GallerySectionProps) {
  if (!detailData) return null;

  const contentType = contentItem.content_type;

  if (contentType === ContentType.SEASON) return null;

  if (!isMovieDetail(detailData) && !isTVShowDetail(detailData) && !isGameDetail(detailData)) {
    return null;
  }

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
  detailData: MovieDetail | TVShowDetail | GameDetail,
  contentType: ContentType
): { src: string; alt: string }[] {
  let title = "";
  let images: { src: string; alt: string }[] = [];

  if (contentType === ContentType.MOVIE && 'type' in detailData && detailData.type === 'MOVIE') {
    title = detailData.title;
    images = detailData.images
      ? Array.from(
          new Map(
            detailData.images
              .filter(img => img.type === ImageType.GALLERY && img.size === "STANDARD")
              .map(img => [img.image_url, img])
          ).values()
        ).map((img, index) => ({
          src: img.image_url,
          alt: `${title} gallery image ${index + 1}`,
        }))
      : [];
  } else if (contentType === ContentType.TV_SHOW && 'type' in detailData && detailData.type === 'TV_SHOW') {
    title = detailData.title;
    images = detailData.images
      ? Array.from(
          new Map(
            detailData.images
              .filter(img => img.type === ImageType.GALLERY && img.size === "STANDARD")
              .map(img => [img.image_url, img])
          ).values()
        ).map((img, index) => ({
          src: img.image_url,
          alt: `${title} gallery image ${index + 1}`,
        }))
      : [];
  } else if (contentType === ContentType.GAME && 'type' in detailData && detailData.type === 'GAME') {
    title = detailData.title;
    images = detailData.images
      ? Array.from(
          new Map(
            detailData.images
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
