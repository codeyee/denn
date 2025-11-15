import {
  MovieDetail,
  TVShowDetail,
  AlbumDetail,
  GameDetail,
  BookDetail,
  ContentType,
  UserList,
  TVSeasonDetail,
  ListItem,
} from "./api";

export type Content =
  | MovieDetail
  | TVShowDetail
  | AlbumDetail
  | GameDetail
  | BookDetail
  | TVSeasonDetail;

export const providerAttribution = {
  [ContentType.MOVIE]: {
    name: "TMDB",
    logo: "/images/logos/tmdb.svg",
    url: "https://www.themoviedb.org/",
  },
  [ContentType.TV_SHOW]: {
    name: "TMDB",
    logo: "/images/logos/tmdb.svg",
    url: "https://www.themoviedb.org/",
  },
  [ContentType.GAME]: {
    name: "IGDB",
    logo: "/images/logos/igdb.svg",
    url: "https://www.igdb.com/",
  },
  [ContentType.BOOK]: {
    name: "Open Library",
    logo: "/images/logos/openlibrary.svg",
    url: "https://openlibrary.org/",
  },
  [ContentType.ALBUM]: {
    name: "Spotify",
    logo: "/images/logos/spotify.svg",
    url: "https://open.spotify.com/",
  },
};

export type ProviderAttribution = typeof providerAttribution;

export type ListWithItems = UserList & { items?: ListItem[] };
