import { useState, useEffect, useRef } from "react";
import { searchActions } from "@/lib/api/actions";
import type {
    MovieDetail,
    TVShowDetail,
    GameDetail,
    AlbumDetail,
    BookDetail,
} from "@/lib/types";
import {
    transformMovieResults,
    transformTVShowResults,
    transformGameResults,
    transformMusicResults,
    transformBookResults,
} from "../utils";

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
        // Create AbortController for this search request
        const controller = new AbortController();
        const { signal } = controller;

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
                const response = await searchActions.multiSearch(
                    {
                        q: searchQueryForThisRequest,
                        limit: 20,
                    },
                    signal
                );

                if (
                    currentSearchQueryRef.current !== searchQueryForThisRequest
                ) {
                    return;
                }

                setResults({
                    movies: transformMovieResults(response.movies?.results || []),
                    tvShows: transformTVShowResults(response["tv-shows"]?.results || []),
                    games: transformGameResults(response.games?.results || []),
                    music: transformMusicResults(response.albums?.results || []),
                    books: transformBookResults(response.books?.results || []),
                });
            } catch (err) {
                // Ignore abort errors (expected when user types quickly)
                if (err instanceof Error && err.name === "AbortError") {
                    return;
                }

                // Only update error if this is still the current search
                if (
                    currentSearchQueryRef.current === searchQueryForThisRequest
                ) {
                    setError(
                        err instanceof Error
                            ? err.message
                            : "An error occurred while searching"
                    );
                    setResults(EMPTY_RESULTS);
                }
            } finally {
                // Only update loading state if this is still the current search
                if (
                    currentSearchQueryRef.current === searchQueryForThisRequest
                ) {
                    setIsLoading(false);
                }
            }
        };

        performSearch();

        // Cleanup: abort pending request when query changes or component unmounts
        return () => {
            controller.abort();
        };
    }, [query]);

    const hasResults =
        results.movies.length > 0 ||
        results.tvShows.length > 0 ||
        results.games.length > 0 ||
        results.music.length > 0 ||
        results.books.length > 0;

    return {
        results,
        isLoading,
        error,
        hasResults,
    };
}
