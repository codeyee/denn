import { api } from "../api";
import { addCountryParam } from "../utils/queryParams";
import type { HomepageResponse } from "@/lib/types";

export interface HomepageQueryParams {
  limit?: number;
  country?: string;
  fields?: string;
  images_size?: number;
}

export const homepageActions = {
  getSuggestions: (params?: HomepageQueryParams): Promise<HomepageResponse> => {
    const searchParams = new URLSearchParams();

    if (params?.limit !== undefined) {
      searchParams.append("limit", String(params.limit));
    } else {
      searchParams.append("limit", "10");
    }

    if (params?.fields) {
      searchParams.append("fields", params.fields);
    }

    if (params?.images_size !== undefined) {
      searchParams.append("images_size", String(params.images_size));
    }

    addCountryParam(searchParams, params?.country);

    return api.get<HomepageResponse>(`/proxy/homepage/?${searchParams}`, true);
  },
};
