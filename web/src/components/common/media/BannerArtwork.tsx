import { BANNER_MEDIA_POSITION } from "./BannerShell";
import { ContainedPosterBannerMedia } from "./ContainedPosterBannerMedia";
import { ResponsiveMedia } from "./ResponsiveMedia";
import type { BannerMedia } from "@/lib/utils/imageUtils";

interface BannerArtworkProps {
  media: BannerMedia;
  alt: string;
  priority?: boolean;
  isBlurred?: boolean;
}

export function BannerArtwork({
  media,
  alt,
  priority = false,
  isBlurred = false,
}: BannerArtworkProps) {
  if (media.treatment === "contained-poster") {
    return (
      <ContainedPosterBannerMedia
        src={media.imageUrl}
        alt={alt}
        priority={priority}
        isBlurred={isBlurred}
      />
    );
  }

  return (
    <ResponsiveMedia
      src={media.imageUrl}
      alt={alt}
      data-banner-media="cover"
      width={1600}
      height={900}
      sizes="100vw"
      priority={priority}
      className={`absolute inset-0 h-full w-full object-cover transition-[filter] duration-200 ${isBlurred ? "scale-105 blur-md" : ""} ${BANNER_MEDIA_POSITION}`}
    />
  );
}
