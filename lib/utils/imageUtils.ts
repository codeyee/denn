import { Image } from "@/lib/api/types";

interface LegacyImageItem {
    images?: {
        artworks?: Array<{ original?: string; standard?: string }>;
        screenshots?: Array<{ original?: string; standard?: string }>;
        backdrop?: { original?: string; standard?: string };
        poster?: { original?: string; standard?: string };
    } | Image[];
    image_url?: string;
}

export function getImageUrl(
    images: Image[] | undefined | null,
    type: string,
    preferredSize: "ORIGINAL" | "STANDARD" = "ORIGINAL"
): string | null {
    if (!images || !Array.isArray(images)) {
        return null;
    }

    const normalizedType = type.toUpperCase();
    const typeImages = images.filter(
        (img) => img.type.toUpperCase() === normalizedType
    );

    if (typeImages.length === 0) {
        return null;
    }

    const preferredImage = typeImages.find(
        (img) => img.size.toUpperCase() === preferredSize
    );
    if (preferredImage) {
        return preferredImage.image_url;
    }

    const fallbackSize = preferredSize === "ORIGINAL" ? "STANDARD" : "ORIGINAL";
    const fallbackImage = typeImages.find(
        (img) => img.size.toUpperCase() === fallbackSize
    );
    if (fallbackImage) return fallbackImage.image_url;

    return typeImages[0]?.image_url || null;
}

export function getBannerImageUrl(
    images: Image[] | undefined | null,
    imageUrl?: string | null
): string | null {
    const gallery = getImageUrl(images, "GALLERY", "ORIGINAL");
    if (gallery) {
        return gallery;
    }

    const poster = getImageUrl(images, "POSTER", "ORIGINAL");
    if (poster) {
        return poster;
    }

    return imageUrl || null;
}

export function getCardImageUrl(
    images: Image[] | undefined | null,
    imageUrl?: string | null
): string | null {
    const poster = getImageUrl(images, "POSTER", "STANDARD");
    if (poster) return poster;

    const gallery = getImageUrl(images, "GALLERY", "STANDARD");
    if (gallery) return gallery;

    return imageUrl || null;
}

export function getLegacyImageUrl(item: LegacyImageItem): string | undefined {
    if (item?.images) {
        const images = item.images;

        if (Array.isArray(images)) {
            return getBannerImageUrl(images, item.image_url) || undefined;
        }

        if (Array.isArray(images?.artworks) && images.artworks.length > 0) {
            const first = images.artworks[0];
            if (first?.original) return first.original;
            if (first?.standard) return first.standard;
        }

        if (
            Array.isArray(images?.screenshots) &&
            images.screenshots.length > 0
        ) {
            const first = images.screenshots[0];
            if (first?.original) return first.original;
            if (first?.standard) return first.standard;
        }

        if (images.backdrop) {
            if (images.backdrop.original) return images.backdrop.original;
            if (images.backdrop.standard) return images.backdrop.standard;
        }

        if (images.poster) {
            if (images.poster.original) return images.poster.original;
            if (images.poster.standard) return images.poster.standard;
        }
    }

    return item?.image_url || undefined;
}
