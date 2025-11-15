import { api } from "../api";
import { addCountryParam } from "../utils/queryParams";
import type { HomepageResponse } from "@/lib/types";

export const homepageActions = {
  getSuggestions: (limit = 10, country?: string): Promise<HomepageResponse> => {
    const params = new URLSearchParams();
    params.append("limit", String(limit));
    addCountryParam(params, country);
    return api.get<HomepageResponse>(`/proxy/homepage/?${params}`, true);
  },
};
