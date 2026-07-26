import { useEffect, useState } from "react";

import { DomeGallery } from "./DomeGallery";

type BackgroundCardImage = {
  src: string;
  alt: string;
};

const AUTH_BACKDROP_IMAGE_LIMIT = 24;
const AUTH_DOME_SEGMENTS = 12;

const isBackgroundCardImage = (value: unknown): value is BackgroundCardImage => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return typeof candidate.src === "string" && typeof candidate.alt === "string";
};

export function AuthBackdrop() {
  const [images, setImages] = useState<BackgroundCardImage[]>([]);

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
      className="pointer-events-none fixed inset-0 overflow-hidden bg-[var(--color-hero-gradient)]"
    >
      <div className="absolute -left-[20vw] inset-y-0 h-full w-[140vw]">
        {images.length > 0 && (
          <DomeGallery
            images={images}
            overlayBlurColor="var(--color-overlay-blur)"
            segments={AUTH_DOME_SEGMENTS}
            imageBorderRadius="20px"
          />
        )}
      </div>
      <div
        className="absolute inset-0 z-10"
        style={{
          backgroundColor: "var(--color-hero-gradient)",
          opacity: 0.7,
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
