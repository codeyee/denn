import {
  MovieDetail,
  TVShowDetail,
  AlbumDetail,
  GameDetail,
  BookDetail,
  ContentType,
  SourceApi,
  User,
  ItemStatus,
  UserList,
  TVSeasonDetail,
} from "@/lib/api/types";
import { MemberRating } from "./listView";

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

export type SourceData =
  | MovieDetail
  | TVShowDetail
  | AlbumDetail
  | GameDetail
  | BookDetail
  | TVSeasonDetail;

export interface ContentItemData {
  id: number;
  source_api: SourceApi;
  external_id: string;
  content_type: ContentType;
  rating_count: number;
  average_rating: number | null;
  created_at: string;
  source_data: SourceData;
}

export interface ListItem {
  id: number;
  user_list: number;
  list_order: number;
  content_item: ContentItemData;
  added_by: User;
  status: ItemStatus;
  added_at: string;
  completed_at: string | null;
  notes: string | null;
  member_ratings: MemberRating[];
  list_rating: number | null;
  member_rating_count: number;
}

export type ListWithItems = UserList & { items?: ListItem[] };

export type { MemberRating };
