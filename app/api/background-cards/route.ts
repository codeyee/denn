import fs from "fs";
import path from "path";
import { NextResponse } from "next/server";

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];

  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled;
}

function getBackgroundCardImages() {
  const cardsDir = path.join(process.cwd(), "public", "images", "background_cards");

  if (!fs.existsSync(cardsDir)) {
    console.warn(`Directory not found: ${cardsDir}`);
    return [];
  }

  const files = fs.readdirSync(cardsDir).filter((file) => {
    const ext = path.extname(file).toLowerCase();
    return [".jpg", ".jpeg", ".png", ".webp", ".gif"].includes(ext);
  });

  const images = files.map((file) => ({
    src: `/images/background_cards/${file}`,
    alt: `Background card ${file.replace(/\.(jpg|jpeg|png|webp|gif)$/i, "")}`,
  }));

  return shuffleArray(images);
}

export async function GET() {
  try {
    const images = getBackgroundCardImages();
    return NextResponse.json(images);
  } catch (error) {
    console.error("Error loading background card images:", error);
    return NextResponse.json([], { status: 500 });
  }
}
