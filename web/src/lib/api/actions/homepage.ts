import { getUserCountryCode } from "@/lib/utils/countryUtils";
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

    const headers = new Headers();
    const country = params?.country || getUserCountryCode();
    if (country) headers.set("X-User-Country", country);

    return fetch(`/api/proxy/homepage?${searchParams}`, { headers }).then(
      async (response) => {
        if (!response.ok) {
          const data = (await response.json().catch(() => ({}))) as {
            message?: unknown;
          };
          const message = typeof data.message === "string"
            ? `: ${data.message}`
            : "";
          throw new Error(`Homepage request failed (${response.status})${message}`);
        }
        return response.json() as Promise<HomepageResponse>;
      },
    );
  },
};
