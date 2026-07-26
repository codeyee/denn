import { useMemo } from "react";

import { buildMosaicRows, type MosaicImage } from "./utils";

type MosaicGalleryProps = {
  imageBorderRadius?: string;
  images: MosaicImage[];
  itemsPerRow?: number;
  rows?: number;
};

export function MosaicGallery({
  imageBorderRadius = "12px",
  images,
  itemsPerRow = 16,
  rows = 5,
}: MosaicGalleryProps) {
  const mosaicRows = useMemo(
    () => buildMosaicRows(images, rows, itemsPerRow),
    [images, itemsPerRow, rows],
  );

  return (
    <div
      aria-hidden="true"
      className="relative size-full overflow-hidden"
      style={
        {
          "--auth-mosaic-radius": imageBorderRadius,
        } as React.CSSProperties
      }
    >
      <div className="auth-mosaic-grid">
        {mosaicRows.map((row, rowIndex) => (
          <div
            key={rowIndex}
            className="auth-mosaic-row"
            style={
              {
                "--auth-mosaic-delay": `${rowIndex * -11}s`,
                "--auth-mosaic-duration": `${72 + rowIndex * 7}s`,
              } as React.CSSProperties
            }
          >
            <div className="auth-mosaic-track">
              {[0, 1].map((copyIndex) => (
                <div
                  key={copyIndex}
                  className="auth-mosaic-set"
                  aria-hidden={copyIndex === 1 ? "true" : undefined}
                >
                  {row.map((image, imageIndex) => (
                    <div
                      key={`${copyIndex}-${image.src}-${imageIndex}`}
                      className="auth-mosaic-tile"
                    >
                      <img
                        src={image.src}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        fetchPriority="low"
                        className="size-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
