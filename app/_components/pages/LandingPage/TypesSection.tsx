"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import LandingCard from "@/app/_components/Card/LandingCard";
import { LucideIcon } from "lucide-react";

import { ProviderAttribution } from "@/types/types";
import {
  contentTypeDefinitions,
  type ContentTypeDefinition,
} from "@/app/api/cards/lib/contentTypeDefinitions";

type ContentType = {
  slug: string;
  icon: LucideIcon;
  title: string;
  description: string;
  backgroundImage: string;
  provider: ProviderAttribution;
  alt: string;
  isFallback: boolean;
};

type ContentTypeApiResponse = {
  type: string;
  title: string;
  description: string;
  provider: ProviderAttribution;
  backgroundImage: string;
  alt: string;
  isFallback: boolean;
};

const CONTENT_TYPES_ENDPOINT = "/api/cards?variant=content-types";

const fallbackAltFromTitle = (title: string) => `${title} background`;

const formatAltFromPath = (source: string, title: string) => {
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
};

const createDefaultContentType = (
  definition: ContentTypeDefinition,
): ContentType => ({
  slug: definition.slug,
  icon: definition.icon,
  title: definition.title,
  description: definition.description,
  provider: definition.provider,
  backgroundImage: definition.defaultBackgroundImage,
  alt: formatAltFromPath(definition.defaultBackgroundImage, definition.title),
  isFallback: true,
});

const defaultContentTypes: ContentType[] = contentTypeDefinitions.map(
  createDefaultContentType,
);

const cloneContentType = (contentType: ContentType): ContentType => ({
  ...contentType,
});

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
      return defaultContentTypes.map(cloneContentType);
    }

    const payload = (await response.json()) as ContentTypeApiResponse[];

    if (!Array.isArray(payload) || payload.length === 0) {
      return defaultContentTypes.map(cloneContentType);
    }

    const payloadMap = new Map(
      payload.map((item) => [item.type ?? item.title, item]),
    );

    return contentTypeDefinitions.map((definition) => {
      const defaultContentType = createDefaultContentType(definition);
      const data = payloadMap.get(definition.slug) ?? payloadMap.get(definition.title);

      if (!data) {
        return defaultContentType;
      }

      return {
        ...defaultContentType,
        backgroundImage: data.backgroundImage ?? defaultContentType.backgroundImage,
        provider: data.provider ?? defaultContentType.provider,
        alt: data.alt ?? defaultContentType.alt,
        isFallback: data.isFallback ?? defaultContentType.isFallback,
      };
    });
  } catch (error) {
    if ((error as Error).name !== "AbortError") {
      console.warn("Failed to load content type backgrounds:", error);
    }
    return defaultContentTypes.map(cloneContentType);
  }
}

// Animation variants
const fadeInUp = {
  hidden: { opacity: 0, y: 60 },
  visible: {
    opacity: 1,
    y: 0,
  },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: {
    opacity: 1,
    scale: 1,
  },
};

export default function TypesSection() {
  const [contentTypes, setContentTypes] = useState(defaultContentTypes);

  const layoutClasses = [
    "lg:col-span-4 xl:col-span-1 xl:col-start-auto",
    "lg:col-span-4 xl:col-span-1 xl:col-start-auto",
    "lg:col-span-4 xl:col-span-1 xl:col-start-auto",
    "lg:col-span-4 lg:col-start-3 xl:col-span-1 xl:col-start-auto",
    "md:mx-auto lg:col-span-4 lg:col-start-7 xl:col-span-1 xl:col-start-auto",
  ];

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
      // Only abort if not already aborted
      if (!controller.signal.aborted) {
        controller.abort();
      }
    };
  }, []);

  return (
    <div className="w-full mx-auto max-w-screen-2xl 2xl:max-w-[1920px] px-4 sm:px-6 lg:px-8 pb-15">
      <div className="space-y-12">
        <motion.div
          className="text-center space-y-4"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={fadeInUp}
        >
          <h2 className="text-3xl md:text-5xl font-bold text-white">
            Everything in One Place
          </h2>
          <p className="text-lg text-gray-300 max-w-2xl mx-auto font-sans">
            Manage all your entertainment content across multiple platforms and
            formats
          </p>
        </motion.div>

        <motion.div
          className="flex flex-wrap justify-center gap-4 md:gap-5 lg:grid lg:grid-cols-12 lg:justify-center xl:grid-cols-5 xl:gap-6 px-1 sm:px-2"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={staggerContainer}
        >
          {contentTypes.map((type, index) => (
            <motion.div
              key={type.slug}
              variants={scaleIn}
              className={`w-full md:basis-1/2 md:max-w-[360px] ${layoutClasses[index] ?? ""}`}
            >
              <LandingCard
                id={type.slug}
                title={type.title}
                icon={type.icon}
                backgroundImage={type.backgroundImage}
                backgroundImageAlt={type.alt}
                provider={type.provider}
              />
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
