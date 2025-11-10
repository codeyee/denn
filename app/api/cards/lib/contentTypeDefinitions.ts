import {
  Film,
  Tv,
  Gamepad2,
  Book,
  Music,
  LucideIcon,
} from "lucide-react";

import { ProviderAttribution } from "@/types";

export type ContentTypeDefinition = {
  slug: string;
  icon: LucideIcon;
  title: string;
  description: string;
  defaultBackgroundImage: string;
  provider: {
    name: string;
    logo: string;
    url: string;
  };
};

export const contentTypeDefinitions: ContentTypeDefinition[] = [
  {
    slug: "movies",
    icon: Film,
    title: "Movies",
    description: "Track your favorite films and discover new ones",
    defaultBackgroundImage: "/images/cards/movie_01.webp",
    provider: {
      name: "TMDB",
      logo: "/images/logos/tmdb.svg",
      url: "https://www.themoviedb.org/",
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
      logo: "/images/logos/tmdb.svg",
      url: "https://www.themoviedb.org/",
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
      logo: "/images/logos/igdb.svg",
      url: "https://www.igdb.com/",
    },
  },
  {
    slug: "music",
    icon: Music,
    title: "Music",
    description: "Curate albums and tracks you love",
    defaultBackgroundImage: "/images/cards/music_01.jpeg",
    provider: {
      name: "Spotify",
      logo: "/images/logos/spotify.svg",
      url: "https://www.spotify.com/",
    },
  },
  {
    slug: "books",
    icon: Book,
    title: "Books",
    description: "Your personal reading list and reviews",
    defaultBackgroundImage: "/images/cards/book_01.jpg",
    provider: {
      name: "Open Library",
      logo: "/images/logos/openlibrary.svg",
      url: "https://openlibrary.org/",
    },
  },
];
