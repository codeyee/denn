import { useState, useEffect, useRef } from "react";
import { searchActions } from "@/lib/api/actions";
import type {
    MultiSearchResponse,
} from "@/lib/types";
import {
    transformMovieResults,
    transformTVShowResults,
    transformGameResults,
    transformMusicResults,
    transformBookResults,
} from "../utils";
import { EMPTY_SEARCH_RESULTS, type SearchResults } from "../types";

interface UseSearchResultsReturn {
    results: SearchResults;
    isLoading: boolean;
    error: string | null;
    hasResults: boolean;
}

interface UseSearchResultsOptions {
    initialQuery?: string;
    initialResults?: SearchResults;
    initialError?: string | null;
}

function transformSearchResponse(response: MultiSearchResponse): SearchResults {
    return {
        movies: transformMovieResults(response.movies?.results || []),
        tvShows: transformTVShowResults(response["tv-shows"]?.results || []),
        games: transformGameResults(response.games?.results || []),
        music: transformMusicResults(response.albums?.results || []),
        books: transformBookResults(response.books?.results || []),
    };
}

export function useSearchResults(
    query: string,
    options: UseSearchResultsOptions = {}
): UseSearchResultsReturn {
    const initialQuery = options.initialQuery?.trim() ?? "";
    const initialResults = options.initialResults ?? EMPTY_SEARCH_RESULTS;
    const initialError = options.initialError ?? null;
    const skippedInitialFetchRef = useRef(false);
    const [results, setResults] = useState<SearchResults>(
        initialQuery ? initialResults : EMPTY_SEARCH_RESULTS
    );
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(initialError);

    const currentSearchQueryRef = useRef<string>("");

    useEffect(() => {
        // Create AbortController for this search request
        const controller = new AbortController();
        const { signal } = controller;

        const performSearch = async () => {
            // Clear results if no query
            if (!query.trim()) {
                setResults(EMPTY_SEARCH_RESULTS);
                setIsLoading(false);
                setError(null);
                currentSearchQueryRef.current = "";
                return;
            }

            const searchQueryForThisRequest = query.trim();
            currentSearchQueryRef.current = searchQueryForThisRequest;

            if (
                !skippedInitialFetchRef.current &&
                searchQueryForThisRequest === initialQuery
            ) {
                skippedInitialFetchRef.current = true;
                setResults(initialResults);
                setError(initialError);
                setIsLoading(false);
                return;
            }

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

                setResults(transformSearchResponse(response));
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
                    setResults(EMPTY_SEARCH_RESULTS);
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
    }, [initialError, initialQuery, initialResults, query]);

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
