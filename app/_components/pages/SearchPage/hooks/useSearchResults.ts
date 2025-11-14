import { useState, useEffect, useRef } from "react";
import { videoActions, gameActions, musicActions, bookActions } from "@/lib/api/actions"; 
import type { MovieDetail, TVShowDetail, GameDetail, AlbumDetail, BookDetail } from "@/lib/api/types";
import { transformMovieResults, transformTVShowResults, transformGameResults, transformMusicResults, transformBookResults } from "../utils";

export interface SearchResults {
  movies: MovieDetail[];
  tvShows: TVShowDetail[];
  games: GameDetail[];
  music: AlbumDetail[];
  books: BookDetail[];
}

interface UseSearchResultsReturn {
  results: SearchResults;
  isLoading: boolean;
  error: string | null;
  hasResults: boolean;
}

const EMPTY_RESULTS: SearchResults = {
  movies: [],
  tvShows: [],
  games: [],
  music: [],
  books: [],
};

export function useSearchResults(query: string): UseSearchResultsReturn {
  const [results, setResults] = useState<SearchResults>(EMPTY_RESULTS);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentSearchQueryRef = useRef<string>("");

  useEffect(() => {
    const performSearch = async () => {
      // Clear results if no query
      if (!query.trim()) {
        setResults(EMPTY_RESULTS);
        setIsLoading(false);
        currentSearchQueryRef.current = "";
        return;
      }

      const searchQueryForThisRequest = query.trim();
      currentSearchQueryRef.current = searchQueryForThisRequest;

      setIsLoading(true);
      setError(null);

      try {
        // Parallel API calls
        const [movieResponse, tvResponse, gameResponse, musicResponse, bookResponse] = await Promise.all([
          videoActions.searchMovies({ query: searchQueryForThisRequest, page_size: 20 }),
          videoActions.searchTVShows({ query: searchQueryForThisRequest, page_size: 20 }),
          gameActions.search({ query: searchQueryForThisRequest, page_size: 20 }),
          musicActions.search({ query: searchQueryForThisRequest, page_size: 20 }),
          bookActions.search({ query: searchQueryForThisRequest, page_size: 20 }),
        ]);

        // Check if this is still the current search (prevent race conditions)
        if (currentSearchQueryRef.current !== searchQueryForThisRequest) {
          return;
        }

        setResults({
          movies: transformMovieResults(movieResponse.results),
          tvShows: transformTVShowResults(tvResponse.results),
          games: transformGameResults(gameResponse.results),
          music: transformMusicResults(musicResponse.results),
          books: transformBookResults(bookResponse.results),
        });
      } catch (err) {
        // Only update error if this is still the current search
        if (currentSearchQueryRef.current === searchQueryForThisRequest) {
          setError(err instanceof Error ? err.message : "An error occurred while searching");
          setResults(EMPTY_RESULTS);
        }
      } finally {
        // Only update loading state if this is still the current search
        if (currentSearchQueryRef.current === searchQueryForThisRequest) {
          setIsLoading(false);
        }
      }
    };

    performSearch();
  }, [query]);

  const hasResults = (
    results.movies.length > 0 ||
    results.tvShows.length > 0 ||
    results.games.length > 0 ||
    results.music.length > 0 ||
    results.books.length > 0
  );

  return {
    results,
    isLoading,
    error,
    hasResults,
  };
}
