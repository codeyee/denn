import { api } from "../api";
import { addCountryParam } from "../utils/queryParams";
import type {
  VideoSearchResponse,
  MovieDetail,
  TVShowDetail,
  TVSeasonDetail,
  BulkMoviesResponse,
  BulkTVShowsResponse,
  VideoSearchParams,
} from "@/lib/types";

export const videoActions = {
  searchMovies: (params: VideoSearchParams, signal?: AbortSignal): Promise<VideoSearchResponse> => {
    const queryParams = new URLSearchParams();
    queryParams.append("query", params.query);
    if (params.page) queryParams.append("page", String(params.page));
    if (params.page_size) queryParams.append("page_size", String(params.page_size));

    return api.get<VideoSearchResponse>(
      `/proxy/movies/search?${queryParams}`,
      true,
      signal
    );
  },

  searchTVShows: (params: VideoSearchParams, signal?: AbortSignal): Promise<VideoSearchResponse> => {
    const queryParams = new URLSearchParams();
    queryParams.append("query", params.query);
    if (params.page) queryParams.append("page", String(params.page));
    if (params.page_size) queryParams.append("page_size", String(params.page_size));

    return api.get<VideoSearchResponse>(
      `/proxy/tv-shows/search?${queryParams}`,
      true,
      signal
    );
  },

  getMovie: (movieId: number, country?: string): Promise<MovieDetail> => {
    const params = new URLSearchParams();
    addCountryParam(params, country);
    return api.get<MovieDetail>(`/proxy/movies/${movieId}?${params}`, true);
  },

  getTVShow: (tvId: number, country?: string): Promise<TVShowDetail> => {
    const params = new URLSearchParams();
    addCountryParam(params, country);
    return api.get<TVShowDetail>(`/proxy/tv-shows/${tvId}?${params}`, true);
  },

  getTVSeason: (tvId: number, seasonNumber: number, country?: string): Promise<TVSeasonDetail> => {
    const params = new URLSearchParams();
    addCountryParam(params, country);
    return api.get<TVSeasonDetail>(
      `/proxy/tv-shows/${tvId}/season/${seasonNumber}?${params}`,
      true
    );
  },

  bulkGetMovies: (ids: number[], country?: string): Promise<BulkMoviesResponse> => {
    const params = new URLSearchParams();
    params.append("ids", ids.join(","));
    addCountryParam(params, country);
    return api.get<BulkMoviesResponse>(`/proxy/movies/bulk?${params}`, true);
  },

  bulkGetTVShows: (ids: number[], country?: string): Promise<BulkTVShowsResponse> => {
    const params = new URLSearchParams();
    params.append("ids", ids.join(","));
    addCountryParam(params, country);
    return api.get<BulkTVShowsResponse>(`/proxy/tv-shows/bulk?${params}`, true);
  },
};
