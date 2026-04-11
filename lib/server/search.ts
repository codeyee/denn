import "server-only";

import { getProxyApiUrl } from "@/lib/env";
import type { MultiSearchResponse } from "@/lib/types";
import { transformBookResults, transformGameResults, transformMovieResults, transformMusicResults, transformTVShowResults } from "@/app/_components/pages/SearchPage/utils";
import { EMPTY_SEARCH_RESULTS, type SearchResults } from "@/app/_components/pages/SearchPage/types";

function getProxyHeaders(country: string | null): HeadersInit {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  const apiKey = process.env.PROXY_API_KEY || process.env.NEXT_PUBLIC_PROXY_API_KEY;
  if (apiKey) {
    headers["X-Api-Key"] = apiKey;
  }

  if (country) {
    headers["X-User-Country"] = country;
  }

  return headers;
}

function transformSearchResults(response: MultiSearchResponse): SearchResults {
  return {
    movies: transformMovieResults(response.movies?.results || []),
    tvShows: transformTVShowResults(response["tv-shows"]?.results || []),
    games: transformGameResults(response.games?.results || []),
    music: transformMusicResults(response.albums?.results || []),
    books: transformBookResults(response.books?.results || []),
  };
}

export async function getSearchResults(
  query: string,
  country: string | null
): Promise<SearchResults> {
  const trimmedQuery = query.trim();

  if (!trimmedQuery) {
    return EMPTY_SEARCH_RESULTS;
  }

  const searchParams = new URLSearchParams({
    q: trimmedQuery,
    limit: "20",
  });

  const response = await fetch(`${getProxyApiUrl()}/search?${searchParams.toString()}`, {
    headers: getProxyHeaders(country),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch search results (${response.status})`);
  }

  const data = (await response.json()) as MultiSearchResponse;
  return transformSearchResults(data);
}
