import type { SearchItem, MovieDetail, TVShowDetail, GameDetail, AlbumDetail, BookDetail } from "@/lib/types";

export function transformMovieResults(results: SearchItem[]): MovieDetail[] {
  return results.map((item) => ({
    ...item,
    id: item.id,
    type: "MOVIE" as const,
    original_title: item.original_title ?? item.title,
    description: item.description ?? null,
    image_url: item.image_url ?? null,
    release_date: item.release_date ?? null,
    authors: item.authors ?? null,
    images: [],
    platforms: null,
    tagline: null,
    imdb_id: null,
    duration_minutes: null,
    status: null,
  }));
}

export function transformTVShowResults(results: SearchItem[]): TVShowDetail[] {
  return results.map((item) => ({
    ...item,
    id: item.id,
    type: "TV_SHOW" as const,
    original_title: item.original_title ?? item.title,
    description: item.description ?? null,
    image_url: item.image_url ?? null,
    release_date: item.release_date ?? null,
    authors: item.authors ?? null,
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

export function transformGameResults(results: SearchItem[]): GameDetail[] {
  return results.map((item) => ({
    ...item,
    id: item.id,
    type: "GAME" as const,
    description: item.description ?? null,
    image_url: item.image_url ?? null,
    release_date: item.release_date ?? null,
    authors: item.authors ?? null,
    images: [],
    platforms: [],
    game_type: null,
    genres: [],
    themes: [],
    game_modes: [],
    series: null,
    play_time: null,
  }));
}

export function transformMusicResults(results: SearchItem[]): AlbumDetail[] {
  return results.map((item) => ({
    ...item,
    id: item.id,
    type: "ALBUM" as const,
    description: item.description ?? null,
    image_url: item.image_url ?? null,
    release_date: item.release_date ?? null,
    authors: item.authors ?? null,
    images: [],
    tracks: [],
    total_tracks: 0,
    album_type: "",
    external_url: "",
    duration_minutes: null,
  }));
}

export function transformBookResults(results: SearchItem[]): BookDetail[] {
  return results.map((item) => ({
    ...item,
    id: item.id,
    type: "BOOK" as const,
    description: item.description ?? null,
    image_url: item.image_url ?? null,
    release_date: item.release_date ?? null,
    authors: item.authors ?? null,
    images: [],
    pages: null,
  }));
}
