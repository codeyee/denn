import { Image, ImageType, ImageSize } from "@/lib/types";

function getFallbackSize(size: ImageSize): ImageSize {
  return size === ImageSize.ORIGINAL ? ImageSize.STANDARD : ImageSize.ORIGINAL;
}

export function getImageUrl(
  images: Image[] | undefined | null,
  type: ImageType | string,
  preferredSize: ImageSize = ImageSize.ORIGINAL
): string | null {
  if (!images || !Array.isArray(images)) return null;

  const normalizedType = type.toUpperCase();

  const typeImages = images.filter((img) => img.type.toUpperCase() === normalizedType);
  if (typeImages.length === 0) return null;

  const preferredImage = typeImages.find((img) => img.size.toUpperCase() === preferredSize);
  if (preferredImage) return preferredImage.image_url;

  const fallbackSize = getFallbackSize(preferredSize);
  const fallbackImage = typeImages.find((img) => img.size.toUpperCase() === fallbackSize);
  if (fallbackImage) return fallbackImage.image_url;

  return typeImages[0]?.image_url || null;
}

export function getBannerImageUrl(
  images: Image[] | undefined | null,
  imageUrl?: string | null
): string | null {
  const gallery = getImageUrl(images, ImageType.GALLERY, ImageSize.ORIGINAL);
  if (gallery) return gallery;

  const poster = getImageUrl(images, ImageType.POSTER, ImageSize.ORIGINAL);
  if (poster) return poster;

  return imageUrl || null;
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
