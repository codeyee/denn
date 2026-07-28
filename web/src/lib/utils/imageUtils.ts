import { Image, ImageType, ImageSize } from "@/lib/types";

export type BannerMediaTreatment = "cover" | "contained-poster";

export interface BannerMedia {
  imageUrl: string;
  treatment: BannerMediaTreatment;
}

const HORIZONTAL_BANNER_TYPES = [
  "banner",
  "backdrop",
  "screenshot",
  "promotional",
  ImageType.GALLERY,
] as const;

function getFallbackSize(size: ImageSize): ImageSize {
  return size === ImageSize.ORIGINAL ? ImageSize.STANDARD : ImageSize.ORIGINAL;
}

export function getImageUrl(
  images: Image[] | undefined | null,
  type: ImageType | string,
  preferredSize: ImageSize = ImageSize.ORIGINAL
): string | null {
  if (!images || !Array.isArray(images)) return null;

  const normalizedType = type.toLowerCase();

  const typeImages = images.filter((img) => img.type.toLowerCase() === normalizedType);
  if (typeImages.length === 0) return null;

  const preferredImage = typeImages.find((img) => img.size.toLowerCase() === preferredSize);
  if (preferredImage) return preferredImage.image_url;

  const fallbackSize = getFallbackSize(preferredSize);
  const fallbackImage = typeImages.find((img) => img.size.toLowerCase() === fallbackSize);
  if (fallbackImage) return fallbackImage.image_url;

  return typeImages[0]?.image_url || null;
}

export function getBannerMedia(
  images: Image[] | undefined | null,
  imageUrl?: string | null
): BannerMedia | null {
  for (const type of HORIZONTAL_BANNER_TYPES) {
    const horizontalImage = getImageUrl(images, type, ImageSize.ORIGINAL);
    if (horizontalImage) {
      return {
        imageUrl: horizontalImage,
        treatment: "cover",
      };
    }
  }

  const poster = getImageUrl(images, ImageType.POSTER, ImageSize.ORIGINAL);
  const posterUrl = poster || imageUrl;

  return posterUrl
    ? {
        imageUrl: posterUrl,
        treatment: "contained-poster",
      }
    : null;
}

export function getBannerImageUrl(
  images: Image[] | undefined | null,
  imageUrl?: string | null
): string | null {
  return getBannerMedia(images, imageUrl)?.imageUrl || null;
}

export function getCardImageUrl(
  images: Image[] | undefined | null,
  imageUrl?: string | null
): string | null {
  const poster = getImageUrl(images, ImageType.POSTER, ImageSize.STANDARD);
  if (poster) return poster;

  const gallery = getImageUrl(images, ImageType.GALLERY, ImageSize.STANDARD);
  if (gallery) return gallery;

  return imageUrl || null;
}
