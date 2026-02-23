import { proxyApi } from "../proxyApi";
import type {
  MusicSearchResponse,
  AlbumDetail,
  BulkAlbumsResponse,
  MusicSearchParams,
} from "@/lib/types";

export const musicActions = {
  search: (params: MusicSearchParams, signal?: AbortSignal): Promise<MusicSearchResponse> => {
    const queryParams = new URLSearchParams();
    queryParams.append("q", params.q);
    if (params.page) queryParams.append("page", String(params.page));
    if (params.limit) queryParams.append("limit", String(params.limit));

    return proxyApi.get<MusicSearchResponse>(`/albums?${queryParams}`, { signal });
  },

  getAlbum: (albumId: string): Promise<AlbumDetail> => {
    return proxyApi.get<AlbumDetail>(`/albums/${albumId}`);
  },

  bulkGetAlbums: (ids: string[]): Promise<BulkAlbumsResponse> => {
    return proxyApi.get<BulkAlbumsResponse>(`/albums/bulk?ids=${ids.join(",")}`);
  },
};
