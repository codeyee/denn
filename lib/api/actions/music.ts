import { api } from "../api";
import type {
  MusicSearchResponse,
  AlbumDetail,
  BulkAlbumsResponse,
  MusicSearchParams,
} from "@/lib/types";

export const musicActions = {
  search: (params: MusicSearchParams): Promise<MusicSearchResponse> => {
    const queryParams = new URLSearchParams();
    queryParams.append("query", params.query);
    if (params.page) queryParams.append("page", String(params.page));
    if (params.page_size) queryParams.append("page_size", String(params.page_size));

    return api.get<MusicSearchResponse>(
      `/proxy/albums/search?${queryParams}`,
      true
    );
  },

  getAlbum: (albumId: string): Promise<AlbumDetail> => {
    return api.get<AlbumDetail>(`/proxy/albums/${albumId}`, true);
  },

  bulkGetAlbums: (ids: string[]): Promise<BulkAlbumsResponse> => {
    const params = new URLSearchParams();
    params.append("ids", ids.join(","));
    return api.get<BulkAlbumsResponse>(`/proxy/albums/bulk?${params}`, true);
  },
};
