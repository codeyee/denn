import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";

import { Noise } from "@/components/common/Noise";
import { useSettings } from "@/hooks/useSettings";

import { DomeGallery } from "./DomeGallery";

type BackgroundCardImage = {
  src: string;
  alt: string;
};

const isBackgroundCardImage = (value: unknown): value is BackgroundCardImage => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return typeof candidate.src === "string" && typeof candidate.alt === "string";
};

export function AuthBackdrop() {
  const containerRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef(0);
  const rotationYRef = useRef(0);
  const [images, setImages] = useState<BackgroundCardImage[]>([]);
  const shouldReduceMotion = useReducedMotion();
  const { settings } = useSettings();
  const shouldAnimate = settings.animationsEnabled && !shouldReduceMotion;

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
          setImages(payload.filter(isBackgroundCardImage));
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

  useEffect(() => {
    if (!shouldAnimate || images.length === 0) {
      return;
    }

    lastTimeRef.current = performance.now();

    const animate = (now: number) => {
      const elapsedSeconds = (now - lastTimeRef.current) / 1000;
      lastTimeRef.current = now;
      rotationYRef.current = (rotationYRef.current + elapsedSeconds * 2) % 360;

      const sphere = containerRef.current?.querySelector<HTMLElement>(".sphere");
      if (sphere) {
        sphere.style.transform = `translateZ(calc(var(--radius) * -1)) rotateX(0deg) rotateY(${rotationYRef.current}deg)`;
      }

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [images.length, shouldAnimate]);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 overflow-hidden bg-[var(--color-hero-gradient)]"
    >
      <div
        ref={containerRef}
        className="absolute -left-[20vw] inset-y-0 h-full w-[140vw]"
      >
        {images.length > 0 && (
          <DomeGallery
            images={images}
            fit={0.6}
            fitBasis="auto"
            minRadius={600}
            maxRadius={Number.POSITIVE_INFINITY}
            padFactor={0.25}
            overlayBlurColor="var(--color-overlay-blur)"
            segments={35}
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
      {shouldAnimate ? (
        <div className="absolute inset-0 z-20">
          <Noise patternAlpha={18} patternRefreshInterval={2} />
        </div>
      ) : null}
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
