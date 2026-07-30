import { proxyApi } from "../proxyApi";
import type { BrowseResponse, BrowseType } from "@/lib/types";

export interface BrowseQueryParams {
  type: BrowseType;
  page: number;
  sort: "popular" | "recent";
  q?: string;
}

export const browseActions = {
  get: (
    params: BrowseQueryParams,
    signal?: AbortSignal,
    country?: string,
  ): Promise<BrowseResponse> => {
    const searchParams = new URLSearchParams({
      type: params.type === "music" ? "albums" : params.type,
      page: String(params.page),
      sort: params.sort,
    });
    if (params.q) searchParams.set("q", params.q);

    return proxyApi.getWithCountry<BrowseResponse>(
      `/browse?${searchParams.toString()}`,
      { signal, country },
    );
  },
};
