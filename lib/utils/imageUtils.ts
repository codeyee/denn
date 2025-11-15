import { Image } from "@/lib/api/types";

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
