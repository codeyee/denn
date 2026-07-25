import { useMemo, useRef } from "react";

import { useDomeResize } from "./useDomeResize";
import { buildDomeItems } from "./utils";

export type DomeImage = {
  src: string;
  alt?: string;
};

type DomeGalleryProps = {
  fit?: number;
  fitBasis?: "auto" | "min" | "max" | "width" | "height";
  imageBorderRadius?: string;
  images: DomeImage[];
  maxRadius?: number;
  minRadius?: number;
  overlayBlurColor?: string;
  padFactor?: number;
  segments?: number;
};

export function DomeGallery({
  fit = 0.5,
  fitBasis = "auto",
  imageBorderRadius = "12px",
  images,
  maxRadius = Number.POSITIVE_INFINITY,
  minRadius = 600,
  overlayBlurColor = "var(--color-overlay-blur)",
  padFactor = 0.25,
  segments = 20,
}: DomeGalleryProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const items = useMemo(
    () => buildDomeItems(images, segments),
    [images, segments],
  );

  useDomeResize({
    fit,
    fitBasis,
    maxRadius,
    minRadius,
    padFactor,
    rootRef,
  });

  return (
    <div
      ref={rootRef}
      aria-hidden="true"
      className="relative size-full"
      style={
        {
          "--segments-x": segments,
          "--segments-y": segments,
          "--overlay-blur-color": overlayBlurColor,
          "--tile-radius": imageBorderRadius,
        } as React.CSSProperties
      }
    >
      <div className="absolute inset-0 grid place-items-center overflow-hidden">
        <div className="auth-dome-stage">
          <div className="sphere">
            {items.map((item, index) => (
              <div
                key={`${item.x},${item.y},${index}`}
                className="auth-dome-item"
                style={
                  {
                    "--offset-x": item.x,
                    "--offset-y": item.y,
                    "--item-size-x": item.sizeX,
                    "--item-size-y": item.sizeY,
                  } as React.CSSProperties
                }
              >
                <div className="auth-dome-image">
                  <img
                    src={item.src}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="absolute inset-0 size-full object-cover"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div
          className="pointer-events-none absolute inset-0 z-10"
          style={{
            backgroundImage:
              "radial-gradient(var(--color-radial-gradient-start) 65%, var(--overlay-blur-color) 100%)",
          }}
        />
        <div
          className="pointer-events-none absolute inset-0 z-10 backdrop-blur-[3px]"
          style={{
            maskImage:
              "radial-gradient(var(--color-radial-gradient-start) 70%, var(--overlay-blur-color) 90%)",
          }}
        />
        <div
          className="pointer-events-none absolute inset-x-0 top-0 z-10 h-[120px] rotate-180"
          style={{
            background:
              "linear-gradient(to bottom, transparent, var(--overlay-blur-color))",
          }}
        />
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-[120px]"
          style={{
            background:
              "linear-gradient(to bottom, transparent, var(--overlay-blur-color))",
          }}
        />
      </div>
    </div>
  );
}
