import { useEffect, useRef } from 'react';
import { clamp } from '../utils';

interface UseDomeResizeParams {
  rootRef: React.RefObject<HTMLDivElement | null>;
  frameRef: React.RefObject<HTMLDivElement | null>;
  mainRef: React.RefObject<HTMLDivElement | null>;
  viewerRef: React.RefObject<HTMLDivElement | null>;
  rotationRef: React.MutableRefObject<{ x: number; y: number }>;
  applyTransform: (x: number, y: number) => void;
  fit: number;
  fitBasis: 'auto' | 'min' | 'max' | 'width' | 'height';
  minRadius: number;
  maxRadius: number;
  padFactor: number;
  overlayBlurColor: string;
  imageBorderRadius: string;
  openedImageBorderRadius: string;
  grayscale: boolean;
  openedImageWidth?: string;
  openedImageHeight?: string;
}

export function useDomeResize({
  rootRef,
  frameRef,
  mainRef,
  viewerRef,
  rotationRef,
  applyTransform,
  fit,
  fitBasis,
  minRadius,
  maxRadius,
  padFactor,
  overlayBlurColor,
  imageBorderRadius,
  openedImageBorderRadius,
  grayscale,
  openedImageWidth,
  openedImageHeight
}: UseDomeResizeParams) {
  const lockedRadiusRef = useRef<number | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const ro = new ResizeObserver(entries => {
      const cr = entries[0].contentRect;
      const w = Math.max(1, cr.width);
      const h = Math.max(1, cr.height);
      const minDim = Math.min(w, h);
      const maxDim = Math.max(w, h);
      const aspect = w / h;

      let basis: number;
      switch (fitBasis) {
        case 'min':
          basis = minDim;
          break;
        case 'max':
          basis = maxDim;
          break;
        case 'width':
          basis = w;
          break;
        case 'height':
          basis = h;
          break;
        default:
          basis = aspect >= 1.3 ? w : minDim;
      }

      let radius = basis * fit;
      const heightGuard = h * 1.35;
      radius = Math.min(radius, heightGuard);
      radius = clamp(radius, minRadius, maxRadius);
      lockedRadiusRef.current = Math.round(radius);

      const viewerPad = Math.max(8, Math.round(minDim * padFactor));
      root.style.setProperty('--radius', `${lockedRadiusRef.current}px`);
      root.style.setProperty('--viewer-pad', `${viewerPad}px`);
      root.style.setProperty('--overlay-blur-color', overlayBlurColor);
      root.style.setProperty('--tile-radius', imageBorderRadius);
      root.style.setProperty('--enlarge-radius', openedImageBorderRadius);
      root.style.setProperty('--image-filter', grayscale ? 'grayscale(1)' : 'none');
      applyTransform(rotationRef.current.x, rotationRef.current.y);

      const enlargedOverlay = viewerRef.current?.querySelector('.enlarge') as HTMLElement;
      if (enlargedOverlay && frameRef.current && mainRef.current) {
        const frameR = frameRef.current.getBoundingClientRect();
        const mainR = mainRef.current.getBoundingClientRect();

        const hasCustomSize = openedImageWidth && openedImageHeight;
        if (hasCustomSize) {
          const tempDiv = document.createElement('div');
          tempDiv.style.cssText = `position: absolute; width: ${openedImageWidth}; height: ${openedImageHeight}; visibility: hidden;`;
          document.body.appendChild(tempDiv);
          const tempRect = tempDiv.getBoundingClientRect();
          document.body.removeChild(tempDiv);

          const centeredLeft = frameR.left - mainR.left + (frameR.width - tempRect.width) / 2;
          const centeredTop = frameR.top - mainR.top + (frameR.height - tempRect.height) / 2;

          enlargedOverlay.style.left = `${centeredLeft}px`;
          enlargedOverlay.style.top = `${centeredTop}px`;
        } else {
          enlargedOverlay.style.left = `${frameR.left - mainR.left}px`;
          enlargedOverlay.style.top = `${frameR.top - mainR.top}px`;
          enlargedOverlay.style.width = `${frameR.width}px`;
          enlargedOverlay.style.height = `${frameR.height}px`;
        }
      }
    });

    ro.observe(root);
    return () => ro.disconnect();
  }, [
    rootRef,
    frameRef,
    mainRef,
    viewerRef,
    rotationRef,
    applyTransform,
    fit,
    fitBasis,
    minRadius,
    maxRadius,
    padFactor,
    overlayBlurColor,
    grayscale,
    imageBorderRadius,
    openedImageBorderRadius,
    openedImageWidth,
    openedImageHeight
  ]);

  useEffect(() => {
    applyTransform(rotationRef.current.x, rotationRef.current.y);
  }, [applyTransform, rotationRef]);
}
