import { useEffect, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  PanelBottomClose,
  PanelBottomOpen,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { DialogDescription, DialogTitle } from "@/components/common/modals/Dialog";
import { Modal } from "@/components/common/modals/Modal";
import { cn } from "@/lib/utils/tailwindUtils";

const MIN_ZOOM = 1;
const MAX_ZOOM = 2.5;
const ZOOM_STEP = 0.5;

export interface ImageGalleryItem {
  id?: string;
  src: string;
  alt: string;
  title: string;
  metadata?: string;
  description?: string | null;
}

interface ImageLightboxProps {
  items: ImageGalleryItem[];
  activeIndex: number | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onIndexChange: (index: number) => void;
}

export function ImageLightbox({
  items,
  activeIndex,
  isOpen,
  onOpenChange,
  onIndexChange,
}: ImageLightboxProps) {
  const [zoom, setZoom] = useState(MIN_ZOOM);
  const [showMetadata, setShowMetadata] = useState(true);
  const previousIndexRef = useRef<number | null>(activeIndex);
  const shouldReduceMotion = useReducedMotion() ?? false;
  const activeItem = activeIndex === null ? undefined : items[activeIndex];
  const transitionDirection = getTransitionDirection(
    previousIndexRef.current,
    activeIndex,
    items.length,
  );

  useEffect(() => {
    setZoom(MIN_ZOOM);
    setShowMetadata(true);
  }, [activeIndex, isOpen]);

  useEffect(() => {
    previousIndexRef.current = activeIndex;
  }, [activeIndex]);

  useEffect(() => {
    if (!isOpen || activeIndex === null) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        onIndexChange(activeIndex === 0 ? items.length - 1 : activeIndex - 1);
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();
        onIndexChange(activeIndex === items.length - 1 ? 0 : activeIndex + 1);
      }

      if (event.key === "+" || event.key === "=") {
        event.preventDefault();
        setZoom((currentZoom) => Math.min(MAX_ZOOM, currentZoom + ZOOM_STEP));
      }

      if (event.key === "-" || event.key === "_") {
        event.preventDefault();
        setZoom((currentZoom) => Math.max(MIN_ZOOM, currentZoom - ZOOM_STEP));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeIndex, isOpen, items.length, onIndexChange]);

  if (!isOpen || !activeItem || activeIndex === null) return null;

  const isZoomed = zoom > MIN_ZOOM;

  const changeZoom = (amount: number) => {
    setZoom((currentZoom) =>
      Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, currentZoom + amount)),
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      showCloseButton={false}
      className="flex h-[min(82dvh,44rem)] min-w-0 w-[calc(100%-1rem)] max-w-none flex-col gap-0 overflow-hidden border-white/10 bg-black/95 p-0 text-white sm:aspect-[16/10] sm:h-auto sm:max-h-[calc(100dvh-2rem)] sm:max-w-none sm:w-[calc(100%-2rem)] md:aspect-video md:max-h-[calc(100dvh-3rem)] md:w-[min(92vw,80rem)]"
    >
      <DialogTitle className="sr-only">{activeItem.title}</DialogTitle>
      <DialogDescription className="sr-only">
        Image {activeIndex + 1} of {items.length}. Use the arrow keys to browse
        the gallery.
      </DialogDescription>

      <div className="relative flex min-h-0 min-w-0 flex-1 items-center justify-center overflow-hidden bg-black">
        <AnimatePresence initial={false} mode="wait">
          <motion.div
            key={`${activeItem.src}-${activeIndex}`}
            initial={
              shouldReduceMotion
                ? false
                : { opacity: 0, x: transitionDirection * 32 }
            }
            animate={{ opacity: 1, x: 0 }}
            exit={
              shouldReduceMotion
                ? undefined
                : { opacity: 0, x: transitionDirection * -32 }
            }
            transition={{
              duration: shouldReduceMotion ? 0 : 0.28,
              ease: "easeOut",
            }}
            className="absolute inset-0 flex items-center justify-center"
          >
            <img
              src={activeItem.src}
              alt={activeItem.alt}
              className={cn(
                "h-full w-full object-contain",
                isZoomed ? "cursor-zoom-out" : "cursor-zoom-in",
              )}
              style={{ transform: `scale(${zoom})` }}
              onClick={() => changeZoom(isZoomed ? -ZOOM_STEP : ZOOM_STEP)}
            />
          </motion.div>
        </AnimatePresence>

        {showMetadata && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-linear-to-t from-black/95 via-black/70 to-transparent px-5 pb-5 pt-20 sm:px-8 sm:pb-8 sm:pt-28">
            <div className="max-w-3xl">
              <p className="text-lg font-bold text-white drop-shadow-text sm:text-2xl">
                {activeItem.title}
              </p>
              {activeItem.metadata && (
                <p className="mt-1 font-sans text-sm text-white/75 sm:text-base">
                  {activeItem.metadata}
                </p>
              )}
              {activeItem.description && (
                <p className="mt-2 max-h-24 overflow-y-auto font-sans text-sm leading-relaxed text-white/85 sm:max-h-32">
                  {activeItem.description}
                </p>
              )}
            </div>
          </div>
        )}

        <div className="absolute left-3 top-3 z-10 rounded-full bg-black/60 px-3 py-1 font-sans text-xs text-white/80 sm:left-5 sm:top-5 sm:text-sm">
          <span aria-live="polite">
            {activeIndex + 1} / {items.length}
          </span>
        </div>

        <div className="absolute right-3 top-3 z-10 flex items-center gap-2 sm:right-5 sm:top-5">
          <button
            type="button"
            onClick={() => changeZoom(isZoomed ? -ZOOM_STEP : ZOOM_STEP)}
            aria-label={isZoomed ? "Zoom out" : "Zoom in"}
            title={isZoomed ? "Zoom out" : "Zoom in"}
            className="inline-flex size-10 cursor-pointer items-center justify-center rounded-full bg-black/65 text-white transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            {isZoomed ? <ZoomOut aria-hidden="true" className="size-5" /> : <ZoomIn aria-hidden="true" className="size-5" />}
          </button>
          <button
            type="button"
            onClick={() => setShowMetadata((visible) => !visible)}
            aria-label={showMetadata ? "Hide image metadata" : "Show image metadata"}
            aria-pressed={showMetadata}
            title={showMetadata ? "Hide image metadata" : "Show image metadata"}
            className="inline-flex size-10 cursor-pointer items-center justify-center rounded-full bg-black/65 text-white transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            {showMetadata ? <PanelBottomClose aria-hidden="true" className="size-5" /> : <PanelBottomOpen aria-hidden="true" className="size-5" />}
          </button>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label="Close gallery"
            className="inline-flex size-10 cursor-pointer items-center justify-center rounded-full bg-black/65 text-white transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <X aria-hidden="true" className="size-5" />
          </button>
        </div>

        <button
          type="button"
          onClick={() => onIndexChange(activeIndex === 0 ? items.length - 1 : activeIndex - 1)}
          aria-label="Previous image"
          className="absolute left-3 top-1/2 z-10 inline-flex size-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-black/65 text-white transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white sm:left-5"
        >
          <ChevronLeft aria-hidden="true" className="size-6" />
        </button>
        <button
          type="button"
          onClick={() => onIndexChange(activeIndex === items.length - 1 ? 0 : activeIndex + 1)}
          aria-label="Next image"
          className="absolute right-3 top-1/2 z-10 inline-flex size-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-black/65 text-white transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white sm:right-5"
        >
          <ChevronRight aria-hidden="true" className="size-6" />
        </button>
      </div>
    </Modal>
  );
}

function getTransitionDirection(
  previousIndex: number | null,
  activeIndex: number | null,
  itemCount: number,
) {
  if (
    previousIndex === null ||
    activeIndex === null ||
    previousIndex === activeIndex ||
    itemCount <= 1
  ) {
    return 1;
  }

  if (previousIndex === itemCount - 1 && activeIndex === 0) return 1;
  if (previousIndex === 0 && activeIndex === itemCount - 1) return -1;

  return activeIndex > previousIndex ? 1 : -1;
}
