import type {
  AlbumDetail,
  BookDetail,
  GameDetail,
  MovieDetail,
  TVShowDetail,
} from "@/lib/types";

export interface SearchResults {
  movies: MovieDetail[];
  tvShows: TVShowDetail[];
  games: GameDetail[];
  music: AlbumDetail[];
  books: BookDetail[];
}

export const EMPTY_SEARCH_RESULTS: SearchResults = {
  movies: [],
  tvShows: [],
  games: [],
  music: [],
  books: [],
};
