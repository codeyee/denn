import { api } from "../api";
import { buildQueryString } from "../utils/queryParams";
import type {
    UserList,
    UserListDetail,
    PaginatedUserListList,
    ListQueryParams,
    ListStatsResponse,
    BulkCheckItem,
    BulkCheckResponse,
    PublicListDetail,
} from "@/lib/types";

export const listActions = {
    bulkCheck: (items: BulkCheckItem[]): Promise<BulkCheckResponse> => {
        return api.post<BulkCheckResponse>(
            "/content/lists/bulk-check/",
            { items },
            true
        );
    },

    list: (params?: ListQueryParams): Promise<PaginatedUserListList> => {
        const query = buildQueryString({
            params,
            addCountry: true,
            country: params?.country,
        });
        return api.get<PaginatedUserListList>(`/content/lists/${query}`, true);
    },

    get: (id: number, params?: ListQueryParams): Promise<UserListDetail> => {
        const query = buildQueryString({
            params,
            addCountry: true,
            country: params?.country,
        });
        return api.get<UserListDetail>(`/content/lists/${id}/${query}`, true);
    },

    getPublic: (id: number): Promise<PublicListDetail> => {
        return api.get<PublicListDetail>(`/content/lists/${id}/`);
    },

    create: (list: {
        name: string;
        description?: string | null;
        list_type: string;
    }): Promise<UserList> => {
        return api.post<UserList>("/content/lists/", list, true);
    },

    update: (id: number, list: Partial<UserList>): Promise<UserList> => {
        return api.put<UserList>(`/content/lists/${id}/`, list, true);
    },

    patch: (id: number, list: Partial<UserList>): Promise<UserList> => {
        return api.patch<UserList>(`/content/lists/${id}/`, list, true);
    },

    delete: (id: number): Promise<void> => {
        return api.delete(`/content/lists/${id}/`, true) as Promise<void>;
    },

    getStats: (id: number): Promise<ListStatsResponse> => {
        return api.get<ListStatsResponse>(`/content/lists/${id}/stats/`, true);
    },
};
