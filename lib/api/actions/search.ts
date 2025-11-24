import { api } from "../api";
import { MultiSearchParams, MultiSearchResponse } from "@/lib/types";

export const searchActions = {
    multiSearch: (
        params: MultiSearchParams,
        signal?: AbortSignal
    ): Promise<MultiSearchResponse> => {
        const queryParams = new URLSearchParams();
        queryParams.append("query", params.query);
        if (params.types) queryParams.append("types", params.types);
        if (params.limit) queryParams.append("limit", String(params.limit));
        if (params.include_unreleased)
            queryParams.append(
                "include_unreleased",
                String(params.include_unreleased)
            );

        return api.get<MultiSearchResponse>(
            `/proxy/search/multi/?${queryParams.toString()}`,
            true,
            signal
        );
    },
};
