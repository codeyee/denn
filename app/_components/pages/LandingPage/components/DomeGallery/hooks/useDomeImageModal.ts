import { useRef, useCallback, useEffect } from 'react';
import { getDataNumber, computeItemBaseRotation, normalizeAngle } from '../utils';

interface UseDomeImageModalParams {
  rootRef: React.RefObject<HTMLDivElement | null>;
  mainRef: React.RefObject<HTMLDivElement | null>;
  frameRef: React.RefObject<HTMLDivElement | null>;
  viewerRef: React.RefObject<HTMLDivElement | null>;
  scrimRef: React.RefObject<HTMLDivElement | null>;
  sphereRef: React.RefObject<HTMLDivElement | null>;
  rotationRef: React.MutableRefObject<{ x: number; y: number }>;
  segments: number;
  enlargeTransitionMs: number;
  openedImageBorderRadius: string;
  openedImageWidth?: string;
  openedImageHeight?: string;
  grayscale: boolean;
  lockScroll: () => void;
  unlockScroll: () => void;
  draggingRef: React.MutableRefObject<boolean>;
}

export function useDomeImageModal({
  rootRef,
  mainRef,
  frameRef,
  viewerRef,
  scrimRef,
  sphereRef,
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
}: UseDomeImageModalParams) {
  const focusedElRef = useRef<HTMLElement | null>(null);
  const openingRef = useRef(false);
  const openStartedAtRef = useRef(0);
  const originalTilePositionRef = useRef<{
    left: number;
    top: number;
    width: number;
    height: number;
  } | null>(null);

  const openItemFromElement = useCallback((el: HTMLElement) => {
    if (openingRef.current) return;
    openingRef.current = true;
    openStartedAtRef.current = performance.now();
    lockScroll();

    const parent = el.parentElement as HTMLElement;
    focusedElRef.current = el;
    el.setAttribute('data-focused', 'true');

    const offsetX = getDataNumber(parent, 'offsetX', 0);
    const offsetY = getDataNumber(parent, 'offsetY', 0);
    const sizeX = getDataNumber(parent, 'sizeX', 2);
    const sizeY = getDataNumber(parent, 'sizeY', 2);

    const parentRot = computeItemBaseRotation(offsetX, offsetY, sizeX, sizeY, segments);
    const parentY = normalizeAngle(parentRot.rotateY);
    const globalY = normalizeAngle(rotationRef.current.y);
    let rotY = -(parentY + globalY) % 360;
    if (rotY < -180) rotY += 360;
    const rotX = -parentRot.rotateX - rotationRef.current.x;

    parent.style.setProperty('--rot-y-delta', `${rotY}deg`);
    parent.style.setProperty('--rot-x-delta', `${rotX}deg`);

    const refDiv = document.createElement('div');
    refDiv.className = 'item__image item__image--reference opacity-0';
    refDiv.style.transform = `rotateX(${-parentRot.rotateX}deg) rotateY(${-parentRot.rotateY}deg)`;
    parent.appendChild(refDiv);

    void refDiv.offsetHeight;

    const tileR = refDiv.getBoundingClientRect();
    const mainR = mainRef.current?.getBoundingClientRect();
    const frameR = frameRef.current?.getBoundingClientRect();

    if (!mainR || !frameR || tileR.width <= 0 || tileR.height <= 0) {
      openingRef.current = false;
      focusedElRef.current = null;
      parent.removeChild(refDiv);
      unlockScroll();
      return;
    }

    originalTilePositionRef.current = {
      left: tileR.left,
      top: tileR.top,
      width: tileR.width,
      height: tileR.height
    };

    el.style.visibility = 'hidden';
    el.style.zIndex = '0';

    const overlay = document.createElement('div');
    overlay.className = 'enlarge';
    overlay.style.cssText = `position:absolute; left:${frameR.left - mainR.left}px; top:${frameR.top - mainR.top}px; width:${frameR.width}px; height:${frameR.height}px; opacity:0; z-index:30; will-change:transform,opacity; transform-origin:top left; transition:transform ${enlargeTransitionMs}ms ease, opacity ${enlargeTransitionMs}ms ease; border-radius:${openedImageBorderRadius}; overflow:hidden; box-shadow:0 10px 30px var(--color-shadow-box);`;

    const rawSrc = parent.dataset.src || (el.querySelector('img') as HTMLImageElement)?.src || '';
    const rawAlt = parent.dataset.alt || (el.querySelector('img') as HTMLImageElement)?.alt || '';

    const img = document.createElement('img');
    img.src = rawSrc;
    img.alt = rawAlt;
    img.style.cssText = `width:100%; height:100%; object-fit:cover; filter:${grayscale ? 'grayscale(1)' : 'none'};`;
    overlay.appendChild(img);
    viewerRef.current!.appendChild(overlay);

    const tx0 = tileR.left - frameR.left;
    const ty0 = tileR.top - frameR.top;
    const sx0 = tileR.width / frameR.width;
    const sy0 = tileR.height / frameR.height;

    const validSx0 = isFinite(sx0) && sx0 > 0 ? sx0 : 1;
    const validSy0 = isFinite(sy0) && sy0 > 0 ? sy0 : 1;

    overlay.style.transform = `translate(${tx0}px, ${ty0}px) scale(${validSx0}, ${validSy0})`;

    setTimeout(() => {
      if (!overlay.parentElement) return;
      overlay.style.opacity = '1';
      overlay.style.transform = 'translate(0px, 0px) scale(1, 1)';
      rootRef.current?.setAttribute('data-enlarging', 'true');
    }, 16);

    const wantsResize = openedImageWidth || openedImageHeight;
    if (wantsResize) {
      const onFirstEnd = (ev: TransitionEvent) => {
        if (ev.propertyName !== 'transform') return;
        overlay.removeEventListener('transitionend', onFirstEnd);

        const prevTransition = overlay.style.transition;
        overlay.style.transition = 'none';

        const tempWidth = openedImageWidth || `${frameR.width}px`;
        const tempHeight = openedImageHeight || `${frameR.height}px`;
        overlay.style.width = tempWidth;
        overlay.style.height = tempHeight;

        const newRect = overlay.getBoundingClientRect();

        overlay.style.width = frameR.width + 'px';
        overlay.style.height = frameR.height + 'px';

        void overlay.offsetWidth;

        overlay.style.transition = `left ${enlargeTransitionMs}ms ease, top ${enlargeTransitionMs}ms ease, width ${enlargeTransitionMs}ms ease, height ${enlargeTransitionMs}ms ease`;

        const centeredLeft = frameR.left - mainR.left + (frameR.width - newRect.width) / 2;
        const centeredTop = frameR.top - mainR.top + (frameR.height - newRect.height) / 2;

        requestAnimationFrame(() => {
          overlay.style.left = `${centeredLeft}px`;
          overlay.style.top = `${centeredTop}px`;
          overlay.style.width = tempWidth;
          overlay.style.height = tempHeight;
        });

        const cleanupSecond = () => {
          overlay.removeEventListener('transitionend', cleanupSecond);
          overlay.style.transition = prevTransition;
        };
        overlay.addEventListener('transitionend', cleanupSecond, { once: true });
      };
      overlay.addEventListener('transitionend', onFirstEnd);
    }
  }, [
    rootRef,
    mainRef,
    frameRef,
    viewerRef,
    sphereRef,
    rotationRef,
    segments,
    enlargeTransitionMs,
    openedImageBorderRadius,
    openedImageWidth,
    openedImageHeight,
    grayscale,
    lockScroll,
    unlockScroll
  ]);

  useEffect(() => {
    const scrim = scrimRef.current;
    if (!scrim) return;

    const close = () => {
      if (performance.now() - openStartedAtRef.current < 250) return;
      const el = focusedElRef.current;
      if (!el) return;

      const parent = el.parentElement as HTMLElement;
      const overlay = viewerRef.current?.querySelector('.enlarge') as HTMLElement | null;
      if (!overlay) return;

      const refDiv = parent.querySelector('.item__image--reference') as HTMLElement | null;
      const originalPos = originalTilePositionRef.current;

      if (!originalPos) {
        overlay.remove();
        if (refDiv) refDiv.remove();
        parent.style.setProperty('--rot-y-delta', `0deg`);
        parent.style.setProperty('--rot-x-delta', `0deg`);
        el.style.visibility = '';
        el.style.zIndex = '0';
        focusedElRef.current = null;
        rootRef.current?.removeAttribute('data-enlarging');
        openingRef.current = false;
        return;
      }

      const currentRect = overlay.getBoundingClientRect();
      const rootRect = rootRef.current!.getBoundingClientRect();

      const originalPosRelativeToRoot = {
        left: originalPos.left - rootRect.left,
        top: originalPos.top - rootRect.top,
        width: originalPos.width,
        height: originalPos.height
      };

      const overlayRelativeToRoot = {
        left: currentRect.left - rootRect.left,
        top: currentRect.top - rootRect.top,
        width: currentRect.width,
        height: currentRect.height
      };

      const animatingOverlay = document.createElement('div');
      animatingOverlay.className = 'enlarge-closing';
      animatingOverlay.style.cssText = `
        position: absolute;
        left: ${overlayRelativeToRoot.left}px;
        top: ${overlayRelativeToRoot.top}px;
        width: ${overlayRelativeToRoot.width}px;
        height: ${overlayRelativeToRoot.height}px;
        z-index: 9999;
        border-radius: ${openedImageBorderRadius};
        overflow: hidden;
        box-shadow: 0 10px 30px var(--color-shadow-box);
        transition: all ${enlargeTransitionMs}ms ease-out;
        pointer-events: none;
        margin: 0;
        transform: none;
        filter: ${grayscale ? 'grayscale(1)' : 'none'};
      `;

      const originalImg = overlay.querySelector('img');
      if (originalImg) {
        const img = originalImg.cloneNode() as HTMLImageElement;
        img.style.cssText = 'width: 100%; height: 100%; object-fit: cover;';
        animatingOverlay.appendChild(img);
      }

      overlay.remove();
      rootRef.current!.appendChild(animatingOverlay);

      void animatingOverlay.getBoundingClientRect();

      requestAnimationFrame(() => {
        animatingOverlay.style.left = originalPosRelativeToRoot.left + 'px';
        animatingOverlay.style.top = originalPosRelativeToRoot.top + 'px';
        animatingOverlay.style.width = originalPosRelativeToRoot.width + 'px';
        animatingOverlay.style.height = originalPosRelativeToRoot.height + 'px';
        animatingOverlay.style.opacity = '0';
      });

      const cleanup = () => {
        animatingOverlay.remove();
        originalTilePositionRef.current = null;

        if (refDiv) refDiv.remove();
        parent.style.transition = 'none';
        el.style.transition = 'none';

        parent.style.setProperty('--rot-y-delta', `0deg`);
        parent.style.setProperty('--rot-x-delta', `0deg`);

        requestAnimationFrame(() => {
          el.style.visibility = '';
          el.style.opacity = '0';
          el.style.zIndex = '0';
          focusedElRef.current = null;
          rootRef.current?.removeAttribute('data-enlarging');

          requestAnimationFrame(() => {
            parent.style.transition = '';
            el.style.transition = 'opacity 300ms ease-out';

            requestAnimationFrame(() => {
              el.style.opacity = '1';
              setTimeout(() => {
                el.style.transition = '';
                el.style.opacity = '';
                openingRef.current = false;
                if (!draggingRef.current && rootRef.current?.getAttribute('data-enlarging') !== 'true') {
                  document.body.classList.remove('dg-scroll-lock');
                }
              }, 300);
            });
          });
        });
      };

      animatingOverlay.addEventListener('transitionend', cleanup, { once: true });
    };

    scrim.addEventListener('click', close);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);

    return () => {
      scrim.removeEventListener('click', close);
      window.removeEventListener('keydown', onKey);
    };
  }, [
    rootRef,
    viewerRef,
    scrimRef,
    enlargeTransitionMs,
    openedImageBorderRadius,
    grayscale,
    draggingRef
  ]);

  return {
    focusedElRef,
    openingRef,
    openItemFromElement
  };
}
