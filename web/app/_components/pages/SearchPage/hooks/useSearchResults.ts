import { useMemo } from "react";

import { SEARCH_RESULT_LIMIT, useMultiSearchQuery } from "@/lib/api/queries";
import type { MultiSearchResponse } from "@/lib/types";
import {
    transformBookResults,
    transformGameResults,
    transformMovieResults,
    transformMusicResults,
    transformTVShowResults,
} from "../utils";
import { EMPTY_SEARCH_RESULTS, type SearchResults } from "../types";

interface UseSearchResultsReturn {
    results: SearchResults;
    isLoading: boolean;
    error: string | null;
    hasResults: boolean;
}

interface UseSearchResultsOptions {
    country?: string | null;
    enabled?: boolean;
}

function transformSearchResponse(response?: MultiSearchResponse): SearchResults {
    if (!response) return EMPTY_SEARCH_RESULTS;

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
    { country, enabled = true }: UseSearchResultsOptions = {},
): UseSearchResultsReturn {
    const trimmedQuery = query.trim();
    const searchQuery = useMultiSearchQuery(trimmedQuery, {
        limit: SEARCH_RESULT_LIMIT,
        country,
        enabled: enabled && trimmedQuery.length > 0,
    });

    const results = useMemo(
        () => transformSearchResponse(searchQuery.data),
        [searchQuery.data],
    );

    const hasResults =
        results.movies.length > 0 ||
        results.tvShows.length > 0 ||
        results.games.length > 0 ||
        results.music.length > 0 ||
        results.books.length > 0;

    return {
        results: trimmedQuery ? results : EMPTY_SEARCH_RESULTS,
        isLoading: searchQuery.isLoading,
        error: searchQuery.error instanceof Error ? searchQuery.error.message : null,
        hasResults,
    };
}
