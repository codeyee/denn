import { useEffect, useState, type ImgHTMLAttributes, type ReactNode } from "react";

interface ResponsiveMediaProps
  extends Omit<
    ImgHTMLAttributes<HTMLImageElement>,
    "alt" | "height" | "loading" | "src" | "srcSet" | "width"
  > {
  src: string;
  alt: string;
  width: number;
  height: number;
  priority?: boolean;
  fallback?: ReactNode;
}

export function ResponsiveMedia({
  src,
  alt,
  width,
  height,
  priority = false,
  fallback,
  sizes,
  onError,
  ...props
}: ResponsiveMediaProps) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  if (failed) {
    return fallback ?? null;
  }

  const srcSet = buildResponsiveSourceSet(src);

  return (
    <img
      {...props}
      src={src}
      srcSet={srcSet}
      sizes={srcSet ? sizes : undefined}
      alt={alt}
      width={width}
      height={height}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : "auto"}
      decoding="async"
      onError={(event) => {
        setFailed(true);
        onError?.(event);
      }}
    />
  );
}

export function buildResponsiveSourceSet(src: string): string | undefined {
  const tmdb = buildTmdbSourceSet(src);
  if (tmdb) return tmdb;

  const igdb = buildIgdbSourceSet(src);
  if (igdb) return igdb;

  return buildOpenLibrarySourceSet(src);
}

function buildTmdbSourceSet(src: string): string | undefined {
  if (!src.includes("image.tmdb.org/t/p/")) return undefined;

  return [
    ["w342", 342],
    ["w500", 500],
    ["w780", 780],
    ["w1280", 1280],
  ]
    .map(([variant, width]) => {
      const candidate = src.replace(
        /\/t\/p\/(?:original|w\d+)\//,
        `/t/p/${variant}/`,
      );
      return `${candidate} ${width}w`;
    })
    .join(", ");
}

function buildIgdbSourceSet(src: string): string | undefined {
  if (!src.includes("images.igdb.com/igdb/image/upload/")) return undefined;

  return [
    ["t_cover_big", 264],
    ["t_720p", 1280],
    ["t_1080p", 1920],
  ]
    .map(([variant, width]) => {
      const candidate = src.replace(
        /\/upload\/t_[^/]+\//,
        `/upload/${variant}/`,
      );
      return `${candidate} ${width}w`;
    })
    .join(", ");
}

function buildOpenLibrarySourceSet(src: string): string | undefined {
  if (!src.includes("covers.openlibrary.org/")) return undefined;
  if (!/-[SML]\.(?:jpg|png)$/i.test(src)) return undefined;

  return [
    ["S", 120],
    ["M", 360],
    ["L", 720],
  ]
    .map(([variant, width]) => (
      `${src.replace(/-[SML](\.(?:jpg|png))$/i, `-${variant}$1`)} ${width}w`
    ))
    .join(", ");
}
