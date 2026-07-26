import { useEffect, useState } from "react";

import { useSettings } from "@/hooks/useSettings";

import { MosaicGallery } from "./MosaicGallery";

type BackgroundCardImage = {
  src: string;
  alt: string;
};

const AUTH_BACKDROP_IMAGE_LIMIT = 24;
const AUTH_MOSAIC_ROWS = 5;
const AUTH_MOSAIC_ITEMS_PER_ROW = 16;

const isBackgroundCardImage = (value: unknown): value is BackgroundCardImage => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return typeof candidate.src === "string" && typeof candidate.alt === "string";
};

export function AuthBackdrop() {
  const [images, setImages] = useState<BackgroundCardImage[]>([]);
  const { settings } = useSettings();

  useEffect(() => {
    const controller = new AbortController();

    const loadImages = async () => {
      try {
        const response = await fetch("/api/cards", { signal: controller.signal });
        if (!response.ok) {
          return;
        }

        const payload: unknown = await response.json();
        if (Array.isArray(payload)) {
          setImages(
            payload
              .filter(isBackgroundCardImage)
              .slice(0, AUTH_BACKDROP_IMAGE_LIMIT),
          );
        }
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          setImages([]);
        }
      }
    };

    void loadImages();
    return () => controller.abort();
  }, []);

  return (
    <div
      aria-hidden="true"
      data-animations={settings.animationsEnabled ? "enabled" : "disabled"}
      className="pointer-events-none fixed inset-0 overflow-hidden bg-[var(--color-hero-gradient)]"
    >
      <div className="absolute inset-0 opacity-75">
        {images.length > 0 && (
          <MosaicGallery
            images={images}
            rows={AUTH_MOSAIC_ROWS}
            itemsPerRow={AUTH_MOSAIC_ITEMS_PER_ROW}
            imageBorderRadius="12px"
          />
        )}
      </div>
      <div
        className="absolute inset-0 z-10"
        style={{
          background:
            "radial-gradient(circle at center, var(--color-hero-gradient-75) 0%, var(--color-hero-gradient-60) 48%, var(--color-hero-gradient-75) 100%)",
        }}
      />
      <div
        className="absolute inset-x-0 top-0 z-20 h-80"
        style={{
          background:
            "linear-gradient(to bottom, var(--color-hero-gradient) 0%, var(--color-hero-gradient-95) 25%, var(--color-hero-gradient-75) 50%, var(--color-hero-gradient-40) 75%, transparent 100%)",
        }}
      />
      <div
        className="absolute inset-x-0 bottom-0 z-20 h-80"
        style={{
          background:
            "linear-gradient(to bottom, transparent 0%, var(--color-hero-gradient-40) 25%, var(--color-hero-gradient-75) 50%, var(--color-hero-gradient-95) 75%, var(--color-hero-gradient) 100%)",
        }}
      />
    </div>
  );
}
