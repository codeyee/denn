import { useEffect, useState } from "react";

import type { RandomPickerItem } from "./types";

export const ROLL_START_INDEX = 12;
export const SPIN_DISTANCE = 16;
export const ROLL_STOP_OFFSET = 4;
export const ROLL_STEP_MS = 72;
export const SETTLE_DURATION_MS = 720;
export const ROLL_DURATION_MS =
  (SPIN_DISTANCE - ROLL_STOP_OFFSET + 1) * ROLL_STEP_MS;
export const ROLLING_SEQUENCE_LENGTH = 48;
export const ROLL_TRAILING_ITEMS = 4;

export function getTargetIndex(startIndex: number) {
  return startIndex + SPIN_DISTANCE;
}

export function getRollStopIndex(targetIndex: number) {
  return targetIndex - ROLL_STOP_OFFSET;
}

export function buildRollingSequence(
  items: RandomPickerItem[],
  minimumLength = ROLLING_SEQUENCE_LENGTH,
) {
  if (items.length === 0) return [];
  return Array.from(
    { length: minimumLength },
    (_, index) => items[index % items.length],
  );
}

export function ensureSpinSequence(
  existingSequence: RandomPickerItem[],
  sourceItems: RandomPickerItem[],
  targetIndex: number,
) {
  const source =
    sourceItems.length > 0 ? sourceItems : existingSequence;
  if (source.length === 0) return [];

  const sequence =
    existingSequence.length > 0
      ? [...existingSequence]
      : buildRollingSequence(source);

  while (sequence.length <= targetIndex + ROLL_TRAILING_ITEMS) {
    sequence.push(source[sequence.length % source.length]);
  }

  return sequence;
}

export function buildSpinSequence(
  existingSequence: RandomPickerItem[],
  sourceItems: RandomPickerItem[],
  result: RandomPickerItem,
  targetIndex: number,
) {
  const sequence = ensureSpinSequence(
    existingSequence,
    sourceItems.length > 0 ? sourceItems : [result],
    targetIndex,
  );

  sequence[targetIndex] = result;
  return sequence;
}

export function wait(durationMs: number) {
  return new Promise<void>((resolve) => window.setTimeout(resolve, durationMs));
}

export function useReducedMotion() {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(mediaQuery.matches);
    update();
    mediaQuery.addEventListener("change", update);
    return () => mediaQuery.removeEventListener("change", update);
  }, []);

  return reducedMotion;
}
