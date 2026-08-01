import { useEffect, useState } from "react";

import { getContentTypeIcon } from "@/lib/icons/contentTypeIcons";
import {
  ROLL_STEP_MS,
  getRollStopIndex,
} from "./randomPickerUtils";
import type { RandomPickerItem, RandomPickerPhase } from "./types";

const CARD_WIDTH = 96;
const CARD_GAP = 12;
const TRACK_PADDING_X = 24;

interface RandomPickerTrackProps {
  items: RandomPickerItem[];
  phase: RandomPickerPhase;
  startIndex: number;
  targetIndex: number;
  onCenterItemChange?: (item: RandomPickerItem) => void;
  onSettledIndexChange?: (index: number) => void;
}

export function RandomPickerTrack({
  items,
  phase,
  startIndex,
  targetIndex,
  onCenterItemChange,
  onSettledIndexChange,
}: RandomPickerTrackProps) {
  const [activeIndex, setActiveIndex] = useState(startIndex);
  const activeOffset = activeIndex * (CARD_WIDTH + CARD_GAP) + CARD_WIDTH / 2;
  const isSettled = phase === "settled";

  useEffect(() => {
    if (phase === "rolling") {
      const rollStopIndex = getRollStopIndex(targetIndex);
      setActiveIndex(startIndex);
      const intervalId = window.setInterval(() => {
        setActiveIndex((currentIndex) =>
          Math.min(currentIndex + 1, rollStopIndex),
        );
      }, ROLL_STEP_MS);
      return () => window.clearInterval(intervalId);
    }

    if (phase === "settling") setActiveIndex(targetIndex);

    if (phase === "settled") {
      setActiveIndex(targetIndex);
      onSettledIndexChange?.(targetIndex);
    }
  }, [onSettledIndexChange, phase, startIndex, targetIndex]);

  useEffect(() => {
    if (phase === "settling") return;
    const activeItem = items[activeIndex];
    if (activeItem) onCenterItemChange?.(activeItem);
  }, [activeIndex, items, onCenterItemChange, phase]);

  return (
    <div className="relative min-h-[186px] overflow-hidden rounded-xl border border-white/10 bg-[var(--color-background-logged-in)] py-4">
      <div
        className={`random-picker-track relative left-1/2 flex w-max gap-3 px-6 ${
          phase === "rolling"
            ? "random-picker-track--rolling"
            : phase === "settling"
              ? "random-picker-track--settling"
              : ""
        }`}
        style={{
          transform: `translateX(-${TRACK_PADDING_X + activeOffset}px)`,
        }}
        aria-hidden="true"
      >
        {items.map((item, index) => (
          <PickerTile
            key={`${item.contentId}-${index}`}
            item={item}
            highlighted={isSettled && index === targetIndex}
          />
        ))}
      </div>
      <div
        data-picker-marker="true"
        className="pointer-events-none absolute inset-y-2 left-1/2 z-10 w-0.5 -translate-x-1/2 bg-amber-300 shadow-[0_0_12px_rgba(252,211,77,0.7)]"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-linear-to-r from-[var(--color-background-logged-in)] to-transparent"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-linear-to-l from-[var(--color-background-logged-in)] to-transparent"
        aria-hidden="true"
      />
    </div>
  );
}

function PickerTile({
  item,
  highlighted,
}: {
  item: RandomPickerItem;
  highlighted: boolean;
}) {
  const TypeIcon = getContentTypeIcon(item.contentType);

  return (
    <div
      data-picker-target={highlighted ? "true" : undefined}
      className={`w-24 shrink-0 rounded-lg ${
        highlighted
          ? "ring-2 ring-amber-300 ring-offset-2 ring-offset-black/30"
          : ""
      }`}
    >
      <div className="relative aspect-5/8 overflow-hidden rounded-lg bg-empty-card">
        {item.imageUrl ? (
          <img
            src={item.imageUrl}
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-white/45">
            <TypeIcon aria-hidden="true" className="h-8 w-8" />
          </div>
        )}
      </div>
    </div>
  );
}
