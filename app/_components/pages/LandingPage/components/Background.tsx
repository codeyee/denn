"use client";

import { ReactNode, useEffect, useRef, useState } from "react";
import { DomeGallery } from "./DomeGallery";
import { Noise } from "@/app/_components/common/animations/Noise";

export type BackgroundCardImage = {
  src: string;
  alt: string;
};

type BackgroundProps = {
  overlayOpacity?: number; // Value between 0 and 1
  overlayColor?: string; // CSS color value
  children?: ReactNode; // Custom content to display on top
  autoRotate?: boolean; // Enable automatic rotation
  autoRotateSpeed?: number; // Rotation speed (degrees per second)
  showNoise?: boolean; // Enable noise effect
  noiseAlpha?: number; // Noise opacity (0-255)
  noiseRefreshInterval?: number; // Frames between noise updates
};

export function Background({
  overlayOpacity = 0.3,
  overlayColor = "var(--color-hero-gradient)",
  children,
  autoRotate = true,
  autoRotateSpeed = 5,
  showNoise = true,
  noiseAlpha = 15,
  noiseRefreshInterval = 2,
}: BackgroundProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const rotationYRef = useRef<number>(0);
  const [backgroundImages, setBackgroundImages] = useState<BackgroundCardImage[]>([]);

  useEffect(() => {
    const fetchImages = async () => {
      try {
        const response = await fetch("/api/cards");
        if (response.ok) {
          const images = await response.json();
          setBackgroundImages(images);
        } else {
          console.error("Failed to fetch background card images");
        }
      } catch (error) {
        console.error("Error fetching background card images:", error);
      }
    };

    fetchImages();
  }, []);

  useEffect(() => {
    if (!autoRotate) return;

    lastTimeRef.current = Date.now();

    const animate = () => {
      const now = Date.now();
      const deltaTime = (now - lastTimeRef.current) / 1000; // Convert to seconds
      lastTimeRef.current = now;

      rotationYRef.current += autoRotateSpeed * deltaTime;
      rotationYRef.current = rotationYRef.current % 360;

      // Find and rotate the sphere element directly
      const sphereElement = containerRef.current?.querySelector(
        ".sphere"
      ) as HTMLElement;
      if (sphereElement) {
        const currentTransform = sphereElement.style.transform || "";
        // Extract rotateX value if exists, otherwise use 0
        const rotateXMatch = currentTransform.match(/rotateX\(([^)]+)\)/);
        const rotateX = rotateXMatch ? rotateXMatch[1] : "0deg";

        sphereElement.style.transform = `translateZ(calc(var(--radius) * -1)) rotateX(${rotateX}) rotateY(${rotationYRef.current}deg)`;
      }

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [autoRotate, autoRotateSpeed]);

  return (
    <div className="relative w-full min-h-screen overflow-hidden">
      {/* Absolute background container - contained within parent */}
      <div className="absolute inset-0 w-full h-full overflow-hidden -z-10">
        <div
          ref={containerRef}
          className="absolute w-[140vw] h-full -left-[20vw]"
        >
          {backgroundImages.length > 0 && (
            <DomeGallery
              images={backgroundImages}
            fit={0.6}
            fitBasis="auto"
            minRadius={600}
            maxRadius={Infinity}
            padFactor={0.25}
            overlayBlurColor="var(--color-overlay-blur)"
            maxVerticalRotationDeg={5}
            dragSensitivity={20}
            enlargeTransitionMs={300}
            segments={35}
            dragDampening={2}
            openedImageWidth="600px"
            openedImageHeight="600px"
              imageBorderRadius="20px"
              openedImageBorderRadius="20px"
              grayscale={false}
            />
          )}
        </div>
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundColor: overlayColor,
            opacity: overlayOpacity,
          }}
        />
        {/* Noise layer */}
        {showNoise && (
          <div className="absolute inset-0 pointer-events-none z-5">
            <Noise
              patternAlpha={noiseAlpha}
              patternRefreshInterval={noiseRefreshInterval}
            />
          </div>
        )}
      </div>
      {/* Scrollable content layer */}
      {children && <div className="relative z-10">{children}</div>}
    </div>
  );
}
