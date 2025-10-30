"use client";

import { ReactNode, useEffect, useRef } from "react";
import DomeGalleryBase from "@/app/_components/ui/DomeGallery/DomeGallery";
import Noise from "@/app/_components/ui/Animations/Noise";

type DomeGalleryProps = {
  overlayOpacity?: number; // Value between 0 and 1
  overlayColor?: string; // CSS color value
  children?: ReactNode; // Custom content to display on top
  autoRotate?: boolean; // Enable automatic rotation
  autoRotateSpeed?: number; // Rotation speed (degrees per second)
  showNoise?: boolean; // Enable noise effect
  noiseAlpha?: number; // Noise opacity (0-255)
  noiseRefreshInterval?: number; // Frames between noise updates
};

// Import all background card images
const backgroundImages = [
  {
    src: "/images/background_cards/image1.webp",
    alt: "Background card 1",
  },
  {
    src: "/images/background_cards/image2.webp",
    alt: "Background card 2",
  },
  {
    src: "/images/background_cards/image3.webp",
    alt: "Background card 3",
  },
  {
    src: "/images/background_cards/image4.webp",
    alt: "Background card 4",
  },
  {
    src: "/images/background_cards/image5.webp",
    alt: "Background card 5",
  },
  {
    src: "/images/background_cards/image6.webp",
    alt: "Background card 6",
  },
  {
    src: "/images/background_cards/image7.webp",
    alt: "Background card 7",
  },
  {
    src: "/images/background_cards/image8.webp",
    alt: "Background card 8",
  },
  {
    src: "/images/background_cards/image9.webp",
    alt: "Background card 9",
  },
  {
    src: "/images/background_cards/image10.webp",
    alt: "Background card 10",
  },
  {
    src: "/images/background_cards/image11.webp",
    alt: "Background card 11",
  },
  {
    src: "/images/background_cards/image12.webp",
    alt: "Background card 12",
  },
  {
    src: "/images/background_cards/image13.jpeg",
    alt: "Background card 13",
  },
  {
    src: "/images/background_cards/image14.jpeg",
    alt: "Background card 14",
  },
  {
    src: "/images/background_cards/image15.jpeg",
    alt: "Background card 15",
  },
  {
    src: "/images/background_cards/image16.jpeg",
    alt: "Background card 16",
  },
  {
    src: "/images/background_cards/image17.jpeg",
    alt: "Background card 17",
  },
];

export default function DomeGallery({
  overlayOpacity = 0.3,
  overlayColor = "#000000",
  children,
  autoRotate = true,
  autoRotateSpeed = 5,
  showNoise = true,
  noiseAlpha = 15,
  noiseRefreshInterval = 2,
}: DomeGalleryProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const rotationYRef = useRef<number>(0);

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
    <div className="relative w-screen h-screen overflow-hidden">
      <div
        ref={containerRef}
        className="absolute w-[140vw] h-screen -left-[20vw]"
      >
        <DomeGalleryBase
          images={backgroundImages}
          fit={0.6}
          fitBasis="auto"
          minRadius={600}
          maxRadius={Infinity}
          padFactor={0.25}
          overlayBlurColor="#060010"
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
      </div>
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundColor: overlayColor,
          opacity: overlayOpacity,
        }}
      />
      {/* Noise layer - stays at screen width */}
      {showNoise && (
        <div className="absolute inset-0 pointer-events-none z-[5]">
          <Noise
            patternAlpha={noiseAlpha}
            patternRefreshInterval={noiseRefreshInterval}
          />
        </div>
      )}
      {/* Custom content layer */}
      {children && <div className="absolute inset-0 z-10">{children}</div>}
    </div>
  );
}
