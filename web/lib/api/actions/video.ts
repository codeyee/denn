import { proxyApi } from "../proxyApi";
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
    queryParams.append("q", params.q);
    if (params.page) queryParams.append("page", String(params.page));
    if (params.limit) queryParams.append("limit", String(params.limit));

    return proxyApi.get<VideoSearchResponse>(`/movies?${queryParams}`, { signal });
  },

  searchTVShows: (params: VideoSearchParams, signal?: AbortSignal): Promise<VideoSearchResponse> => {
    const queryParams = new URLSearchParams();
    queryParams.append("q", params.q);
    if (params.page) queryParams.append("page", String(params.page));
    if (params.limit) queryParams.append("limit", String(params.limit));

    return proxyApi.get<VideoSearchResponse>(`/tv-shows?${queryParams}`, { signal });
  },

  getMovie: (movieId: string, country?: string): Promise<MovieDetail> => {
    return proxyApi.getWithCountry<MovieDetail>(`/movies/${movieId}`, { country });
  },

  getTVShow: (tvId: string, country?: string): Promise<TVShowDetail> => {
    return proxyApi.getWithCountry<TVShowDetail>(`/tv-shows/${tvId}`, { country });
  },

  getTVSeason: (tvId: string, seasonNumber: number, country?: string): Promise<TVSeasonDetail> => {
    return proxyApi.getWithCountry<TVSeasonDetail>(
      `/tv-shows/${tvId}/seasons/${seasonNumber}`,
      { country }
    );
  },

  bulkGetMovies: (ids: string[], country?: string): Promise<BulkMoviesResponse> => {
    return proxyApi.getWithCountry<BulkMoviesResponse>(
      `/movies/bulk?ids=${ids.join(",")}`,
      { country }
    );
  },

  bulkGetTVShows: (ids: string[], country?: string): Promise<BulkTVShowsResponse> => {
    return proxyApi.getWithCountry<BulkTVShowsResponse>(
      `/tv-shows/bulk?ids=${ids.join(",")}`,
      { country }
    );
  },
};
