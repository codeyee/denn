import type { ReactNode } from "react";

import { ResponsiveMedia } from "@/components/common/media/ResponsiveMedia";
import { cn } from "@/lib/utils/tailwindUtils";

interface MediaListItemProps {
  title: string;
  description?: string;
  subDescription?: string;
  image?: string | null;
  imageAlt?: string;
  mediaFallback?: ReactNode;
  leadingContent?: ReactNode;
  titleIcon?: ReactNode;
  trailingContent?: ReactNode;
  children?: ReactNode;
  overlay?: ReactNode;
  className?: string;
  onClick?: () => void;
  variant?: "compact" | "review";
}

export function MediaListItem({
  title,
  description,
  subDescription,
  image,
  imageAlt = "",
  mediaFallback,
  leadingContent,
  titleIcon,
  trailingContent,
  children,
  overlay,
  className,
  onClick,
  variant = "compact",
}: MediaListItemProps) {
  const isReview = variant === "review";

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-lg bg-list-item-background transition-colors duration-200 hover:bg-list-item-background-hover motion-reduce:transition-none md:flex md:items-stretch",
        onClick && "cursor-pointer",
        className,
      )}
      onClick={onClick}
    >
      <div className="absolute inset-0 md:hidden">
        <MediaArtwork
          image={image}
          imageAlt={imageAlt}
          mediaFallback={mediaFallback}
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-black/60" />
        <div className="absolute inset-0 bg-linear-to-t from-list-item-background via-black/55 to-black/20" />
      </div>

      <div
        className={cn(
          "relative hidden shrink-0 md:block",
          isReview ? "w-64" : "w-44",
        )}
      >
        <MediaArtwork
          image={image}
          imageAlt={imageAlt}
          mediaFallback={mediaFallback}
          sizes={isReview ? "256px" : "176px"}
        />
        <div className="pointer-events-none absolute -inset-y-px -right-px w-[calc(100%+1px)] bg-linear-to-r from-transparent via-hero-gradient-70 to-list-item-background transition-colors duration-200 group-hover:to-list-item-background-hover motion-reduce:transition-none" />
      </div>

      {overlay}

      <div
        className={cn(
          "relative z-0 flex min-w-0 flex-1 items-end gap-3 px-4 py-4 md:px-5",
          overlay && "pointer-events-none z-20",
          isReview ? "min-h-60 md:min-h-44 md:items-start" : "min-h-25 md:items-center",
        )}
      >
        {leadingContent ? <div className="shrink-0">{leadingContent}</div> : null}
        <ItemContent
          title={title}
          titleIcon={titleIcon}
          description={description}
          subDescription={subDescription}
          trailingContent={trailingContent}
          isReview={isReview}
        >
          {children}
        </ItemContent>
      </div>
    </div>
  );
}

function MediaArtwork({
  image,
  imageAlt,
  mediaFallback,
  sizes,
}: {
  image?: string | null;
  imageAlt: string;
  mediaFallback?: ReactNode;
  sizes: string;
}) {
  return (
    <div className="absolute inset-0 grid place-items-center bg-[radial-gradient(circle_at_25%_20%,rgba(123,63,152,0.35),transparent_55%),#160b19]">
      {image ? (
        <ResponsiveMedia
          src={image}
          alt={imageAlt}
          width={640}
          height={360}
          sizes={sizes}
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="text-white/30">{mediaFallback}</div>
      )}
    </div>
  );
}

function ItemContent({
  title,
  titleIcon,
  description,
  subDescription,
  trailingContent,
  isReview,
  children,
}: {
  title: string;
  titleIcon?: ReactNode;
  description?: string;
  subDescription?: string;
  trailingContent?: ReactNode;
  isReview: boolean;
  children?: ReactNode;
}) {
  return (
    <div className="min-w-0 flex-1">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="flex items-start gap-2 font-medium text-white drop-shadow-text">
            {titleIcon ? (
              <span className="mt-0.5 shrink-0 text-white/75">{titleIcon}</span>
            ) : null}
            <span
              className={cn(
                isReview
                  ? "line-clamp-2 text-base md:text-lg"
                  : "line-clamp-3 text-sm md:text-base",
              )}
            >
              {title}
            </span>
          </h3>
          {description ? (
            <p className="mt-1 text-xs text-white/60 drop-shadow-text">
              {description}
            </p>
          ) : null}
          {subDescription ? (
            <p className="mt-1 text-xs text-white/50 drop-shadow-text">
              {subDescription}
            </p>
          ) : null}
        </div>
        {trailingContent ? (
          <div className="shrink-0 font-sans">{trailingContent}</div>
        ) : null}
      </div>
      {children}
    </div>
  );
}
