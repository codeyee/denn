import { createImagePayload, getCardFiles, getCategoryFromFileName } from "./fileSystem";
import type { BackgroundCardImage } from "./types";

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];

  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled;
}


export function getBackgroundCardImages(): BackgroundCardImage[] {
  const files = getCardFiles();
  const images = files.map((file) => createImagePayload(file));
  return shuffleArray(images);
}

export function getImagesByCategory() {
  const files = getCardFiles();

  return files.reduce<Record<string, BackgroundCardImage[]>>((acc, file) => {
    const category = getCategoryFromFileName(file);

    if (!category) {
      return acc;
    }

    if (!acc[category]) {
      acc[category] = [];
    }

    acc[category].push(createImagePayload(file));

    return acc;
  }, {});
}
