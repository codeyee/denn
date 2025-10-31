import fs from "fs";
import path from "path";

import { formatCardAlt } from "./formatters";
import type { BackgroundCardImage } from "./types";

const SUPPORTED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".gif"];
type SupportedExtension = (typeof SUPPORTED_EXTENSIONS)[number];


export function getCardsDirectory() {
  return path.join(process.cwd(), "public", "images", "cards");
}

export function getCardFiles() {
  const cardsDir = getCardsDirectory();

  if (!fs.existsSync(cardsDir)) {
    console.warn(`Directory not found: ${cardsDir}`);
    return [] as string[];
  }

  return fs.readdirSync(cardsDir).filter((file) => {
    const ext = path.extname(file).toLowerCase() as SupportedExtension | string;
    return SUPPORTED_EXTENSIONS.includes(ext as SupportedExtension);
  });
}

export function getCategoryFromFileName(fileName: string) {
  if (!fileName) {
    return null;
  }

  const normalized = fileName.toLowerCase();
  const [category] = normalized.split("_");

  return category?.trim() ? category.trim() : null;
}

export function createImagePayload(file: string): BackgroundCardImage {
  return {
    src: `/images/cards/${file}`,
    alt: formatCardAlt(file),
  };
}
