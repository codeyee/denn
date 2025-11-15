'use client';

import { useEffect, useMemo, useRef } from 'react';
import Image from 'next/image';
import { useGesture } from '@use-gesture/react';
import { buildItems, DEFAULTS } from './utils';
import { DOME_GALLERY_STYLES } from './styles';
import { useScrollLock } from './hooks/useScrollLock';
import { useDomeRotation } from './hooks/useDomeRotation';
import { useDomeResize } from './hooks/useDomeResize';
import { useDomeImageModal } from './hooks/useDomeImageModal';
import type { ImageItem } from './utils';

export type DomeGalleryProps = {
  images?: ImageItem[];
  fit?: number;
  fitBasis?: 'auto' | 'min' | 'max' | 'width' | 'height';
  minRadius?: number;
  maxRadius?: number;
  padFactor?: number;
  overlayBlurColor?: string;
  maxVerticalRotationDeg?: number;
  enlargeTransitionMs?: number;
  segments?: number;
  dragDampening?: number;
  openedImageWidth?: string;
  openedImageHeight?: string;
  imageBorderRadius?: string;
  openedImageBorderRadius?: string;
  grayscale?: boolean;
  placeholderColor?: string;
};

export function DomeGallery({
  images = [],
  fit = 0.5,
  fitBasis = 'auto',
  minRadius = 600,
  maxRadius = Infinity,
  padFactor = 0.25,
  overlayBlurColor = 'var(--color-overlay-blur)',
  maxVerticalRotationDeg = DEFAULTS.maxVerticalRotationDeg,
  enlargeTransitionMs = DEFAULTS.enlargeTransitionMs,
  segments = DEFAULTS.segments,
  dragDampening = 2,
  openedImageWidth = '400px',
  openedImageHeight = '400px',
  imageBorderRadius = '30px',
  openedImageBorderRadius = '30px',
  grayscale = true,
  placeholderColor = 'oklch(0 0 0)'
}: DomeGalleryProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLDivElement>(null);
  const sphereRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<HTMLDivElement>(null);
  const scrimRef = useRef<HTMLDivElement>(null);

  const items = useMemo(() => buildItems(images, segments), [images, segments]);

  const { lockScroll, unlockScroll } = useScrollLock(rootRef);

  const {
    rotationRef,
    applyTransform,
    draggingRef,
    movedRef,
    lastDragEndAt
  } = useDomeRotation({
    sphereRef,
    maxVerticalRotationDeg,
    dragDampening
  });

  useDomeResize({
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
  });

  const { focusedElRef, openingRef, openItemFromElement } = useDomeImageModal({
    rootRef,
    mainRef,
    frameRef,
    viewerRef,
    scrimRef,
    rotationRef,
    segments,
    enlargeTransitionMs,
    openedImageBorderRadius,
    openedImageWidth,
    openedImageHeight,
    grayscale,
    lockScroll,
    unlockScroll,
    draggingRef
  });

  useGesture(
    {
      onDragStart: ({ event }) => {
        if (focusedElRef.current) return;
        const evt = event as PointerEvent;
        const potential = (evt.target as Element).closest?.('.item__image') as HTMLElement | null;
        if (potential && !draggingRef.current) {
          setTimeout(() => {
            if (!movedRef.current && !draggingRef.current) {
              openItemFromElement(potential);
            }
          }, 0);
        }
      },
      onDrag: () => {}
    },
    { target: mainRef, eventOptions: { passive: false } }
  );

  useEffect(() => {
    return () => {
      document.body.classList.remove('dg-scroll-lock');
    };
  }, []);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: DOME_GALLERY_STYLES }} />
      <div
        ref={rootRef}
        className="sphere-root relative w-full h-full"
        style={
          {
            '--segments-x': segments,
            '--segments-y': segments,
            '--overlay-blur-color': overlayBlurColor,
            '--tile-radius': imageBorderRadius,
            '--enlarge-radius': openedImageBorderRadius,
            '--image-filter': grayscale ? 'grayscale(1)' : 'none'
          } as React.CSSProperties & Record<string, string | number>
        }
      >
        <main
          ref={mainRef}
          className="absolute inset-0 grid place-items-center overflow-hidden select-none bg-transparent"
          style={{
            touchAction: 'none',
            WebkitUserSelect: 'none'
          }}
        >
          <div className="stage">
            <div ref={sphereRef} className="sphere">
              {items.map((it, i) => (
                <div
                  key={`${it.x},${it.y},${i}`}
                  className="sphere-item absolute m-auto"
                  data-src={it.src}
                  data-alt={it.alt}
                  data-offset-x={it.x}
                  data-offset-y={it.y}
                  data-size-x={it.sizeX}
                  data-size-y={it.sizeY}
                  style={
                    {
                      '--offset-x': it.x,
                      '--offset-y': it.y,
                      '--item-size-x': it.sizeX,
                      '--item-size-y': it.sizeY,
                      top: '-999px',
                      bottom: '-999px',
                      left: '-999px',
                      right: '-999px'
                    } as React.CSSProperties & Record<string, string | number>
                  }
                >
                  <div
                    className="item__image absolute block overflow-hidden cursor-pointer transition-transform duration-300"
                    role="button"
                    tabIndex={0}
                    aria-label={it.alt || 'Open image'}
                    onClick={e => {
                      if (draggingRef.current || movedRef.current) return;
                      if (performance.now() - lastDragEndAt.current < 80) return;
                      if (openingRef.current) return;
                      openItemFromElement(e.currentTarget as HTMLElement);
                    }}
                    onPointerUp={e => {
                      if ((e.nativeEvent as PointerEvent).pointerType !== 'touch') return;
                      if (draggingRef.current || movedRef.current) return;
                      if (performance.now() - lastDragEndAt.current < 80) return;
                      if (openingRef.current) return;
                      openItemFromElement(e.currentTarget as HTMLElement);
                    }}
                    style={{
                      inset: 'var(--item-inset, 10px)',
                      borderRadius: `var(--tile-radius, ${imageBorderRadius})`,
                      backfaceVisibility: 'hidden',
                      backgroundColor: placeholderColor
                    }}
                  >
                    <Image
                      src={it.src}
                      alt={it.alt}
                      fill
                      className="object-cover pointer-events-none"
                      style={{
                        backfaceVisibility: 'hidden',
                        filter: `var(--image-filter, ${grayscale ? 'grayscale(1)' : 'none'})`
                      }}
                      sizes="(max-width: 768px) 25vw, 20vw"
                      unoptimized
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div
            className="absolute inset-0 m-auto z-3 pointer-events-none"
            style={{
              backgroundImage: `radial-gradient(var(--color-radial-gradient-start) 65%, var(--overlay-blur-color, ${overlayBlurColor}) 100%)`
            }}
          />

          <div
            className="absolute inset-0 m-auto z-3 pointer-events-none"
            style={{
              WebkitMaskImage: `radial-gradient(var(--color-radial-gradient-start) 70%, var(--overlay-blur-color, ${overlayBlurColor}) 90%)`,
              maskImage: `radial-gradient(var(--color-radial-gradient-start) 70%, var(--overlay-blur-color, ${overlayBlurColor}) 90%)`,
              backdropFilter: 'blur(3px)'
            }}
          />

          <div
            className="absolute left-0 right-0 top-0 h-[120px] z-5 pointer-events-none rotate-180"
            style={{
              background: `linear-gradient(to bottom, transparent, var(--overlay-blur-color, ${overlayBlurColor}))`
            }}
          />
          <div
            className="absolute left-0 right-0 bottom-0 h-[120px] z-5 pointer-events-none"
            style={{
              background: `linear-gradient(to bottom, transparent, var(--overlay-blur-color, ${overlayBlurColor}))`
            }}
          />

          <div
            ref={viewerRef}
            className="absolute inset-0 z-20 pointer-events-none flex items-center justify-center"
            style={{ padding: 'var(--viewer-pad)' }}
          >
            <div
              ref={scrimRef}
              className="scrim absolute inset-0 z-10 pointer-events-none opacity-0 transition-opacity duration-500"
              style={{
                background: 'var(--color-overlay-dark)',
                backdropFilter: 'blur(3px)'
              }}
            />
            <div
              ref={frameRef}
              className="viewer-frame h-full aspect-square flex"
              style={{
                borderRadius: `var(--enlarge-radius, ${openedImageBorderRadius})`
              }}
            />
          </div>
        </main>
      </div>
    </>
  );
}
