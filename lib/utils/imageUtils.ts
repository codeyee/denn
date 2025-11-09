import { Image } from "@/lib/api/types";

/**
 * Helper to extract image URL from the new Image[] structure
 * @param images - Array of images from the API
 * @param type - Image type (e.g., "POSTER", "GALLERY", "SCREENSHOT", "ARTWORK")
 * @param preferredSize - Preferred size ("ORIGINAL" or "STANDARD"), defaults to "ORIGINAL"
 * @returns Image URL or null
 */
export function getImageUrl(
  images: Image[] | undefined | null,
  type: string,
  preferredSize: "ORIGINAL" | "STANDARD" = "ORIGINAL"
): string | null {
  if (!images || !Array.isArray(images)) return null;

  // Normalize type to uppercase for comparison
  const normalizedType = type.toUpperCase();

  // Find images of the requested type
  const typeImages = images.filter(
    (img) => img.type.toUpperCase() === normalizedType
  );

  if (typeImages.length === 0) return null;

  // Try to find the preferred size
  const preferredImage = typeImages.find(
    (img) => img.size.toUpperCase() === preferredSize
  );
  if (preferredImage) return preferredImage.image_url;

  // Fall back to the other size
  const fallbackSize = preferredSize === "ORIGINAL" ? "STANDARD" : "ORIGINAL";
  const fallbackImage = typeImages.find(
    (img) => img.size.toUpperCase() === fallbackSize
  );
  if (fallbackImage) return fallbackImage.image_url;

  // If no size match, return the first one
  return typeImages[0]?.image_url || null;
}

/**
 * Get the best image URL for banners/backgrounds
 * Prefers GALLERY (backdrop) over POSTER
 */
export function getBannerImageUrl(
  images: Image[] | undefined | null,
  imageUrl?: string | null
): string | null {
  // Try GALLERY (backdrop equivalent) first
  const gallery = getImageUrl(images, "GALLERY", "ORIGINAL");
  if (gallery) return gallery;

  // Fall back to POSTER
  const poster = getImageUrl(images, "POSTER", "ORIGINAL");
  if (poster) return poster;

  // Use the fallback image_url if provided
  return imageUrl || null;
}

/**
 * Get the best image URL for cards/thumbnails
 * Prefers POSTER, falls back to other types
 */
export function getCardImageUrl(
  images: Image[] | undefined | null,
  imageUrl?: string | null
): string | null {
  // Try POSTER first (best for cards)
  const poster = getImageUrl(images, "POSTER", "STANDARD");
  if (poster) return poster;

  // For games, try SCREENSHOT or ARTWORK
  const screenshot = getImageUrl(images, "SCREENSHOT", "STANDARD");
  if (screenshot) return screenshot;

  const artwork = getImageUrl(images, "ARTWORK", "STANDARD");
  if (artwork) return artwork;

  // Fall back to GALLERY if nothing else
  const gallery = getImageUrl(images, "GALLERY", "STANDARD");
  if (gallery) return gallery;

  // Use the fallback image_url if provided
  return imageUrl || null;
}

/**
 * Backward compatibility helper for old image structure
 * This handles both old { poster: { original, standard }, backdrop: { original, standard } }
 * and new Image[] structures
 */
export function getLegacyImageUrl(item: any): string | undefined {
  // If item has images property
  if (item?.images) {
    const images = item.images;

    // Check if it's the new Image[] structure
    if (Array.isArray(images)) {
      return getBannerImageUrl(images, item.image_url) || undefined;
    }

    // Handle old structure for backward compatibility
    // Check for game-specific images first (artworks, screenshots)
    if (Array.isArray(images?.artworks) && images.artworks.length > 0) {
      const first = images.artworks[0];
      if (first?.original) return first.original;
      if (first?.standard) return first.standard;
    }

    if (Array.isArray(images?.screenshots) && images.screenshots.length > 0) {
      const first = images.screenshots[0];
      if (first?.original) return first.original;
      if (first?.standard) return first.standard;
    }

    // Check for video content (movies, TV shows, seasons) - backdrop is preferred
    if (images.backdrop) {
      if (images.backdrop.original) return images.backdrop.original;
      if (images.backdrop.standard) return images.backdrop.standard;
    }

    // Fall back to poster if no backdrop
    if (images.poster) {
      if (images.poster.original) return images.poster.original;
      if (images.poster.standard) return images.poster.standard;
    }
  }

  return item?.image_url || undefined;
}
