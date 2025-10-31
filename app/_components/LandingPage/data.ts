import {
  Film,
  Tv,
  Gamepad2,
  Book,
  Music,
  Users,
  Star,
  List,
  Share2,
  TrendingUp,
  CheckCircle2,
  LucideIcon,
} from "lucide-react";

export type ProviderAttribution = {
  name: string;
  href?: string;
};

export type ContentTypeDefinition = {
  slug: string;
  icon: LucideIcon;
  title: string;
  description: string;
  defaultBackgroundImage: string;
  provider: ProviderAttribution;
};

export type ContentType = {
  slug: string;
  icon: LucideIcon;
  title: string;
  description: string;
  backgroundImage: string;
  provider: ProviderAttribution;
  alt: string;
  isFallback: boolean;
};

export type Feature = {
  icon: LucideIcon;
  title: string;
  description: string;
};

const CONTENT_TYPES_ENDPOINT = "/api/background-cards?variant=content-types";

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

export const contentTypeDefinitions: ContentTypeDefinition[] = [
  {
    slug: "movies",
    icon: Film,
    title: "Movies",
    description: "Track your favorite films and discover new ones",
    defaultBackgroundImage: "/images/cards/movie_01.jpeg",
    provider: {
      name: "TMDB",
      href: "https://www.themoviedb.org/",
    },
  },
  {
    slug: "tv-shows",
    icon: Tv,
    title: "TV Shows",
    description: "Keep up with series across all platforms",
    defaultBackgroundImage: "/images/cards/tv_01.webp",
    provider: {
      name: "TMDB",
      href: "https://www.themoviedb.org/",
    },
  },
  {
    slug: "games",
    icon: Gamepad2,
    title: "Games",
    description: "Manage your gaming library and backlog",
    defaultBackgroundImage: "/images/cards/game_01.jpg",
    provider: {
      name: "IGDB",
      href: "https://www.igdb.com/",
    },
  },
  {
    slug: "music",
    icon: Music,
    title: "Music",
    description: "Curate albums and tracks you love",
    defaultBackgroundImage: "/images/cards/music_01.webp",
    provider: {
      name: "Spotify",
      href: "https://www.spotify.com/",
    },
  },
  {
    slug: "books",
    icon: Book,
    title: "Books",
    description: "Your personal reading list and reviews",
    defaultBackgroundImage: "/images/cards/book_01.jpeg",
    provider: {
      name: "OpenLibrary",
      href: "https://openlibrary.org/",
    },
  },
];

export const defaultContentTypes: ContentType[] = contentTypeDefinitions.map(
  createDefaultContentType,
);

type ContentTypeApiResponse = {
  type: string;
  title: string;
  description: string;
  provider: ProviderAttribution;
  backgroundImage: string;
  alt: string;
  isFallback: boolean;
};

const cloneContentType = (contentType: ContentType): ContentType => ({
  ...contentType,
});

export async function fetchContentTypes(
  options: { signal?: AbortSignal } = {},
): Promise<ContentType[]> {
  try {
    const response = await fetch(CONTENT_TYPES_ENDPOINT, {
      method: "GET",
      cache: "no-store",
      signal: options.signal,
    });

    if (!response.ok) {
      throw new Error(
        `Failed to fetch content type backgrounds: ${response.status} ${response.statusText}`,
      );
    }

    const payload = (await response.json()) as ContentTypeApiResponse[];

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
    console.error("Failed to load content type backgrounds:", error);
    return defaultContentTypes.map(cloneContentType);
  }
}

export const features: Feature[] = [
  {
    icon: List,
    title: "Create Custom Lists",
    description: "Organize your content exactly how you want it",
  },
  {
    icon: Share2,
    title: "Collaborative Lists",
    description: "Invite friends to build and manage lists together",
  },
  {
    icon: Star,
    title: "Rate & Review",
    description: "Share your thoughts with personalized ratings and comments",
  },
  {
    icon: Users,
    title: "Social Features",
    description: "Connect with others who share your taste",
  },
  {
    icon: TrendingUp,
    title: "Track Progress",
    description: "See your watching, reading, and playing statistics",
  },
  {
    icon: CheckCircle2,
    title: "Stay Organized",
    description: "Never forget what you want to watch, play, or read next",
  },
];

export const fadeInUp = {
  hidden: { opacity: 0, y: 60 },
  visible: {
    opacity: 1,
    y: 0,
  },
};

export const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

export const scaleIn = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: {
    opacity: 1,
    scale: 1,
  },
};
