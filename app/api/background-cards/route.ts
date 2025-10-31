import fs from "fs";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import type { ProviderAttribution } from "@/app/_components/LandingPage/data";
import { contentTypeDefinitions } from "@/app/_components/LandingPage/data";

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];

  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled;
}

const SUPPORTED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".gif"] as const;

type SupportedExtension = (typeof SUPPORTED_EXTENSIONS)[number];

type BackgroundCardImage = {
  src: string;
  alt: string;
};

function formatCardAlt(fileName: string) {
  const baseName = path.basename(fileName, path.extname(fileName));
  const [rawCategory, ...rest] = baseName.split("_");

  if (!rawCategory) {
    return `Background card ${baseName}`;
  }

  const category = rawCategory
    .replace(/[-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

  if (rest.length === 0) {
    return `${category} background card`;
  }

  const identifier = rest
    .map((segment) => segment.replace(/[-]+/g, " "))
    .join(" ")
    .trim();

  return `${category} background card ${identifier}`.trim();
}

function getCardFiles() {
  const cardsDir = path.join(process.cwd(), "public", "images", "cards");

  if (!fs.existsSync(cardsDir)) {
    console.warn(`Directory not found: ${cardsDir}`);
    return [] as string[];
  }

  return fs.readdirSync(cardsDir).filter((file) => {
    const ext = path.extname(file).toLowerCase() as SupportedExtension | string;
    return SUPPORTED_EXTENSIONS.includes(ext as SupportedExtension);
  });
}

function getCategoryFromFileName(fileName: string) {
  if (!fileName) {
    return null;
  }

  const normalized = fileName.toLowerCase();
  const [category] = normalized.split("_");

  return category?.trim() ? category.trim() : null;
}

function createImagePayload(file: string): BackgroundCardImage {
  return {
    src: `/images/cards/${file}`,
    alt: formatCardAlt(file),
  };
}

function getBackgroundCardImages() {
  const files = getCardFiles();

  const images = files.map((file) => createImagePayload(file));

  return shuffleArray(images);
}

function getImagesByCategory() {
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

function createAltFromRelativePath(relativePath: string) {
  const fileName = path.basename(relativePath);

  if (!fileName) {
    return "Background card";
  }

  return formatCardAlt(fileName);
}

type ContentTypeBackground = {
  type: string;
  title: string;
  description: string;
  provider: ProviderAttribution;
  backgroundImage: string;
  alt: string;
  isFallback: boolean;
};

function getRandomContentTypeBackgrounds(): ContentTypeBackground[] {
  const imagesByCategory = getImagesByCategory();

  return contentTypeDefinitions.map(({ icon: _icon, defaultBackgroundImage, ...type }) => {
    const fallbackFileName = path.basename(defaultBackgroundImage);
    const lookupKeys = [
      getCategoryFromFileName(fallbackFileName ?? ""),
      type.slug,
    ].filter((key): key is string => Boolean(key && key.length));

    const availableImages = lookupKeys
      .map((key) => imagesByCategory[key])
      .find((group): group is BackgroundCardImage[] => Boolean(group?.length));

    const selectedImage = availableImages
      ? availableImages[Math.floor(Math.random() * availableImages.length)]
      : {
          src: defaultBackgroundImage,
          alt: createAltFromRelativePath(defaultBackgroundImage),
        };

    return {
      type: type.slug,
      title: type.title,
      description: type.description,
      provider: type.provider,
      backgroundImage: selectedImage.src,
      alt: selectedImage.alt,
      isFallback: !availableImages,
    };
  });
}

export async function GET(request: NextRequest) {
  try {
    const variant = request.nextUrl.searchParams.get("variant");
    const mode = request.nextUrl.searchParams.get("mode");

    if (variant === "content-types" || mode === "content-types") {
      const contentTypeBackgrounds = getRandomContentTypeBackgrounds();
      return NextResponse.json(contentTypeBackgrounds);
    }

    const images = getBackgroundCardImages();
    return NextResponse.json(images);
  } catch (error) {
    console.error("Error loading background card images:", error);
    return NextResponse.json([], { status: 500 });
  }
}
