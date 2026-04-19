import { useEffect, useState } from "react";
import {
  contentTypeDefinitions,
  type ContentTypeDefinition,
} from "@/app/api/cards/lib/contentTypeDefinitions";
import { LucideIcon } from "lucide-react";
import { Provider } from "@/app/api/cards/lib/contentTypeDefinitions";

export type ContentType = {
  slug: string;
  icon: LucideIcon;
  title: string;
  description: string;
  backgroundImage: string;
  providers: Provider[];
  alt: string;
  isFallback: boolean;
};

type ContentTypeApiResponse = {
  type: string;
  title: string;
  description: string;
  provider?: Provider | Provider[];
  providers?: Provider[];
  backgroundImage: string;
  alt: string;
  isFallback: boolean;
};

const CONTENT_TYPES_ENDPOINT = "/api/cards?variant=content-types";

export function useContentTypes() {
  const [contentTypes, setContentTypes] = useState(() =>
    contentTypeDefinitions.map(createDefaultContentType),
  );

  useEffect(() => {
    const controller = new AbortController();
    let isMounted = true;

    const loadContentTypes = async () => {
      try {
        const types = await fetchContentTypes({ signal: controller.signal });
        if (isMounted) {
          setContentTypes(types);
        }
      } catch (error) {
        if ((error as Error).name === "AbortError") {
          return;
        }
        console.error("Failed to fetch content types:", error);
      }
    };

    loadContentTypes();

    return () => {
      isMounted = false;
      if (!controller.signal.aborted) {
        controller.abort();
      }
    };
  }, []);

  return contentTypes;
}

function createDefaultContentType(
  definition: ContentTypeDefinition,
): ContentType {
  const providers = Array.isArray(definition.provider)
    ? definition.provider
    : [definition.provider];

  return {
    slug: definition.slug,
    icon: definition.icon,
    title: definition.title,
    description: definition.description,
    providers,
    backgroundImage: definition.defaultBackgroundImage,
    alt: formatAltFromPath(definition.defaultBackgroundImage, definition.title),
    isFallback: true,
  };
}

async function fetchContentTypes(
  options: { signal?: AbortSignal } = {},
): Promise<ContentType[]> {
  try {
    const response = await fetch(CONTENT_TYPES_ENDPOINT, {
      method: "GET",
      cache: "no-store",
      signal: options.signal,
    });

    if (!response.ok) {
      console.warn(
        `Failed to fetch content type backgrounds: ${response.status} ${response.statusText}. Using fallback images.`,
      );
      return contentTypeDefinitions.map(createDefaultContentType);
    }

    const payload = (await response.json()) as ContentTypeApiResponse[];

    if (!Array.isArray(payload) || payload.length === 0) {
      return contentTypeDefinitions.map(createDefaultContentType);
    }

    const payloadMap = new Map(
      payload.map((item) => [item.type ?? item.title, item]),
    );

    return contentTypeDefinitions.map((definition) => {
      const defaultContentType = createDefaultContentType(definition);
      const data =
        payloadMap.get(definition.slug) ?? payloadMap.get(definition.title);

      if (!data) {
        return defaultContentType;
      }

      const apiProviders = data.providers ?? (data.provider ? (Array.isArray(data.provider) ? data.provider : [data.provider]) : null);
      const providers = apiProviders ?? defaultContentType.providers;

      return {
        ...defaultContentType,
        backgroundImage: data.backgroundImage ?? defaultContentType.backgroundImage,
        providers,
        alt: data.alt ?? defaultContentType.alt,
        isFallback: data.isFallback ?? defaultContentType.isFallback,
      };
    });
  } catch (error) {
    if ((error as Error).name !== "AbortError") {
      console.warn("Failed to load content type backgrounds:", error);
    }
    return contentTypeDefinitions.map(createDefaultContentType);
  }
}

function formatAltFromPath(source: string, title: string): string {
  const fileName = source.split("/").pop();

  if (!fileName) {
    return fallbackAltFromTitle(title);
  }

  const baseName = fileName.replace(/\.[^.]+$/, "");
  const [rawCategory, ...rest] = baseName.split("_");

  if (!rawCategory) {
    return fallbackAltFromTitle(title);
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

function fallbackAltFromTitle(title: string): string {
  return `${title} background`;
}
