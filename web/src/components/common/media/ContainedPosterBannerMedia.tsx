import { ResponsiveMedia } from "./ResponsiveMedia";

interface ContainedPosterBannerMediaProps {
  src: string;
  alt: string;
  priority?: boolean;
}

export function ContainedPosterBannerMedia({
  src,
  alt,
  priority = false,
}: ContainedPosterBannerMediaProps) {
  return (
    <div
      data-banner-media="contained-poster"
      className="absolute inset-0 overflow-hidden bg-[#160b19]"
    >
      <ResponsiveMedia
        src={src}
        alt=""
        aria-hidden="true"
        width={1600}
        height={1600}
        sizes="100vw"
        priority={priority}
        className="absolute -inset-[4%] h-[108%] w-[108%] scale-105 object-cover opacity-90 blur-md brightness-125 saturate-110"
      />
      <div
        data-banner-foreground
        className="absolute inset-x-4 top-12 bottom-44 flex items-center justify-center md:inset-x-8 md:top-4 md:bottom-8"
      >
        <ResponsiveMedia
          src={src}
          alt={alt}
          width={1000}
          height={1000}
          sizes="(min-width: 768px) 70vw, 84vw"
          priority={priority}
          className="h-full w-full max-w-[min(84vw,36rem)] object-contain brightness-110 drop-shadow-[0_16px_28px_rgba(0,0,0,0.5)] md:max-w-[min(70vw,38rem)]"
        />
      </div>
    </div>
  );
}
