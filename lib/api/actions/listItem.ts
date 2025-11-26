import { api } from "../api";
import {
    buildQueryString,
    addPaginationParams,
    addCountryParam,
} from "../utils/queryParams";
import type {
    ListItem,
    PaginatedListItemList,
    ListItemCreate,
} from "@/lib/types";

export const listItemActions = {
    list: (
        listId: number,
        page?: number,
        pageSize?: number,
        country?: string
    ): Promise<PaginatedListItemList> => {
        const params = new URLSearchParams();
        if (page !== undefined) params.append("page", String(page));
        if (pageSize !== undefined)
            params.append("page_size", String(pageSize));
        addCountryParam(params, country);

        const query = params.toString();
        return api.get<PaginatedListItemList>(
            `/content/lists/${listId}/items/${query ? `?${query}` : ""}`,
            true
        );
    },

    get: (
        listId: number,
        itemId: number,
        country?: string
    ): Promise<ListItem> => {
        const query = buildQueryString({ addCountry: true, country });
        return api.get<ListItem>(
            `/content/lists/${listId}/items/${itemId}/${query}`,
            true
        );
    },

    create: (
        listId: number,
        item: ListItemCreate,
        fields?: string
    ): Promise<ListItem> => {
        const params = new URLSearchParams();
        if (fields) params.append("fields", fields);
        const query = params.toString();
        return api.post<ListItem>(
            `/content/lists/${listId}/items/${query ? `?${query}` : ""}`,
            item,
            true
        );
    },

    update: (
        listId: number,
        itemId: number,
        item: Partial<ListItem>
    ): Promise<ListItem> => {
        return api.put<ListItem>(
            `/content/lists/${listId}/items/${itemId}/`,
            item,
            true
        );
    },

    patch: (
        listId: number,
        itemId: number,
        item: Partial<ListItem>
    ): Promise<ListItem> => {
        return api.patch<ListItem>(
            `/content/lists/${listId}/items/${itemId}/`,
            item,
            true
        );
    },

    delete: (listId: number, itemId: number): Promise<void> => {
        return api.delete(
            `/content/lists/${listId}/items/${itemId}/`,
            true
        ) as Promise<void>;
    },

    move: (
        listId: number,
        itemId: number,
        position: number,
        page?: number,
        pageSize?: number
    ): Promise<PaginatedListItemList> => {
        const params = new URLSearchParams();
        params.append("position", String(position));
        addPaginationParams(params, { page, pageSize });

        return api.post<PaginatedListItemList>(
            `/content/lists/${listId}/items/${itemId}/move/?${params}`,
            {},
            true
        );
    },

    reorder: (
        listId: number,
        itemIds: number[],
        page?: number,
        pageSize?: number
    ): Promise<PaginatedListItemList> => {
        const params = new URLSearchParams();
        addPaginationParams(params, { page, pageSize });

        const query = params.toString();
        return api.post<PaginatedListItemList>(
            `/content/lists/${listId}/items/reorder/${
                query ? `?${query}` : ""
            }`,
            { order: itemIds },
            true
        );
    },
};
