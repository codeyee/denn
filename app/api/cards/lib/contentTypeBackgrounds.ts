import path from "path";

import { contentTypeDefinitions } from "@/app/_components/LandingPage/data";

import { createAltFromRelativePath } from "./formatters";
import { getCategoryFromFileName } from "./fileSystem";
import { getImagesByCategory } from "./backgroundCards";
import type { BackgroundCardImage, ContentTypeBackground } from "./types";

function selectImage(availableImages: BackgroundCardImage[] | undefined, fallbackImage: string) {
  if (!availableImages || availableImages.length === 0) {
    return {
      src: fallbackImage,
      alt: createAltFromRelativePath(fallbackImage),
      isFallback: true,
    } as const;
  }

  const selectedImage = availableImages[Math.floor(Math.random() * availableImages.length)];

  return {
    ...selectedImage,
    isFallback: false,
  } as const;
}

export function getRandomContentTypeBackgrounds(): ContentTypeBackground[] {
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

    const image = selectImage(availableImages, defaultBackgroundImage);

    return {
      type: type.slug,
      title: type.title,
      description: type.description,
      provider: type.provider,
      backgroundImage: image.src,
      alt: image.alt,
      isFallback: image.isFallback,
    };
  });
}
