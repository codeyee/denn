import { api } from "../api";
import type {
  GameSearchResponse,
  GameDetail,
  BulkGamesResponse,
  GameSearchParams,
} from "@/lib/types";

export const gameActions = {
  search: (params: GameSearchParams, signal?: AbortSignal): Promise<GameSearchResponse> => {
    const queryParams = new URLSearchParams();
    queryParams.append("query", params.query);
    if (params.page) queryParams.append("page", String(params.page));
    if (params.page_size) queryParams.append("page_size", String(params.page_size));

    return api.get<GameSearchResponse>(
      `/proxy/games/search?${queryParams}`,
      true,
      signal
    );
  },

  getGame: (gameId: number): Promise<GameDetail> => {
    return api.get<GameDetail>(`/proxy/games/${gameId}`, true);
  },

  bulkGetGames: (ids: number[]): Promise<BulkGamesResponse> => {
    const params = new URLSearchParams();
    params.append("ids", ids.join(","));
    return api.get<BulkGamesResponse>(`/proxy/games/bulk?${params}`, true);
  },
};
