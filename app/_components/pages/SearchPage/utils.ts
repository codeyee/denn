import type {
  SearchItem,
  MovieDetail,
  TVShowDetail,
  GameDetail,
  AlbumDetail,
  BookDetail,
} from "@/lib/api/types";

/**
 * Transform search results to MovieDetail format
 */
export function transformMovieResults(results: SearchItem[]): MovieDetail[] {
  return results.map((item) => ({
    ...item,
    type: "MOVIE" as const,
    images: [],
    platforms: null,
    tagline: null,
    imdb_id: null,
    duration_minutes: null,
    status: null,
  }));
}

/**
 * Transform search results to TVShowDetail format
 */
export function transformTVShowResults(results: SearchItem[]): TVShowDetail[] {
  return results.map((item) => ({
    ...item,
    type: "TV_SHOW" as const,
    images: [],
    platforms: null,
    seasons: [],
    tagline: null,
    imdb_id: null,
    status: null,
    number_of_seasons: null,
    number_of_episodes: null,
  }));
}

/**
 * Transform search results to GameDetail format
 */
export function transformGameResults(results: SearchItem[]): GameDetail[] {
  return results.map((item) => ({
    ...item,
    type: "GAME" as const,
    images: [],
    platforms: [],
    game_type: null,
  }));
}

/**
 * Transform search results to AlbumDetail format
 */
export function transformMusicResults(results: SearchItem[]): AlbumDetail[] {
  return results.map((item) => ({
    ...item,
    type: "ALBUM" as const,
    images: [],
    tracks: [],
    total_tracks: 0,
    album_type: "",
    external_url: "",
    duration_minutes: null,
  }));
}

/**
 * Transform search results to BookDetail format
 */
export function transformBookResults(results: SearchItem[]): BookDetail[] {
  return results.map((item) => ({
    ...item,
    type: "BOOK" as const,
    images: [],
    pages: null,
  }));
}
