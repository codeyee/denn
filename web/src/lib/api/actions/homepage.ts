import { proxyApi } from "../proxyApi";
import { resolveContentIds } from "../contentResolution";
import type { HomepageResponse } from "@/lib/types";

export interface HomepageQueryParams {
  limit?: number;
  country?: string;
}

export const homepageActions = {
  getSuggestions: (params?: HomepageQueryParams): Promise<HomepageResponse> => {
    const searchParams = new URLSearchParams();

    if (params?.limit !== undefined) {
      searchParams.append("limit", String(params.limit));
    } else {
      searchParams.append("limit", "10");
    }

    return proxyApi.getWithCountry<HomepageResponse>(
      `/homepage?${searchParams}`,
      { country: params?.country }
    ).then((response) => resolveContentIds(response, params?.country));
  },
};
