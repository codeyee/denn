import { proxyApi } from "../proxyApi";
import type { MultiSearchParams, MultiSearchResponse } from "@/lib/types";

export const searchActions = {
  multiSearch: (
    params: MultiSearchParams,
    signal?: AbortSignal,
    country?: string,
  ): Promise<MultiSearchResponse> => {
    const queryParams = new URLSearchParams();
    queryParams.append("q", params.q);
    if (params.types) queryParams.append("types", params.types);
    if (params.limit) queryParams.append("limit", String(params.limit));

    return proxyApi.get<MultiSearchResponse>(
      `/search?${queryParams.toString()}`,
      { signal, country }
    );
  },
};
