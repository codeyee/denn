import { createImagePayload, getCardFiles } from "./fileSystem";
import type { BackgroundCardImage } from "./types";

export const BACKGROUND_CARD_LIMIT = 24;

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];

  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled;
}

export function getBackgroundCardImages(
  limit = BACKGROUND_CARD_LIMIT,
): BackgroundCardImage[] {
  const files = getCardFiles();
  const images = files.map((file) => createImagePayload(file));
  return shuffleArray(images).slice(0, limit);
}
