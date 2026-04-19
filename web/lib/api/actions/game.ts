import { proxyApi } from "../proxyApi";
import type {
  GameSearchResponse,
  GameDetail,
  BulkGamesResponse,
  GameSearchParams,
} from "@/lib/types";

export const gameActions = {
  search: (params: GameSearchParams, signal?: AbortSignal): Promise<GameSearchResponse> => {
    const queryParams = new URLSearchParams();
    queryParams.append("q", params.q);
    if (params.page) queryParams.append("page", String(params.page));
    if (params.limit) queryParams.append("limit", String(params.limit));

    return proxyApi.get<GameSearchResponse>(`/games?${queryParams}`, { signal });
  },

  getGame: (gameId: string): Promise<GameDetail> => {
    return proxyApi.get<GameDetail>(`/games/${gameId}`);
  },

  bulkGetGames: (ids: string[]): Promise<BulkGamesResponse> => {
    return proxyApi.get<BulkGamesResponse>(`/games/bulk?ids=${ids.join(",")}`);
  },
};
