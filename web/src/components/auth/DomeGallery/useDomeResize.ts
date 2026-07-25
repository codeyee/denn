import { useEffect } from "react";

type UseDomeResizeParams = {
  fit: number;
  fitBasis: "auto" | "min" | "max" | "width" | "height";
  maxRadius: number;
  minRadius: number;
  padFactor: number;
  rootRef: React.RefObject<HTMLDivElement | null>;
};

export function useDomeResize({
  fit,
  fitBasis,
  maxRadius,
  minRadius,
  padFactor,
  rootRef,
}: UseDomeResizeParams) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root) {
      return;
    }

    const observer = new ResizeObserver(([entry]) => {
      const width = Math.max(1, entry.contentRect.width);
      const height = Math.max(1, entry.contentRect.height);
      const minDimension = Math.min(width, height);
      const maxDimension = Math.max(width, height);
      const basis = getFitBasis(
        fitBasis,
        width,
        height,
        minDimension,
        maxDimension,
      );
      const radius = Math.min(
        maxRadius,
        Math.max(minRadius, Math.min(basis * fit, height * 1.35)),
      );

      root.style.setProperty("--radius", `${Math.round(radius)}px`);
      root.style.setProperty(
        "--viewer-pad",
        `${Math.max(8, Math.round(minDimension * padFactor))}px`,
      );
    });

    observer.observe(root);
    return () => observer.disconnect();
  }, [fit, fitBasis, maxRadius, minRadius, padFactor, rootRef]);
}

function getFitBasis(
  fitBasis: UseDomeResizeParams["fitBasis"],
  width: number,
  height: number,
  minDimension: number,
  maxDimension: number,
) {
  switch (fitBasis) {
    case "min":
      return minDimension;
    case "max":
      return maxDimension;
    case "width":
      return width;
    case "height":
      return height;
    default:
      return width / height >= 1.3 ? width : minDimension;
  }
}
