import { api } from "../api";
import {
    buildFlexFieldsQuery,
    buildQueryString,
    addPaginationParams,
    addCountryParam,
} from "../utils/queryParams";
import type {
    ListItem,
    PaginatedListItemList,
    ListItemCreate,
} from "@/lib/types";

interface ListItemQueryOptions {
    country?: string;
    fields?: string;
    expand?: string;
    omit?: string;
    source_fields?: string;
}

function buildListItemQuery(
    page?: number,
    pageSize?: number,
    options: ListItemQueryOptions = {}
): string {
    const params = new URLSearchParams();
    addPaginationParams(params, { page, pageSize });

    const flexFieldsQuery = buildFlexFieldsQuery({
        fields: options.fields ? options.fields.split(",") : undefined,
        expand: options.expand ? options.expand.split(",") : undefined,
        omit: options.omit ? options.omit.split(",") : undefined,
        sourceFields: options.source_fields
            ? options.source_fields.split(",")
            : undefined,
    });

    if (flexFieldsQuery) {
        const flexParams = new URLSearchParams(flexFieldsQuery);
        flexParams.forEach((value, key) => {
            params.append(key, value);
        });
    }

    addCountryParam(params, options.country);

    return params.toString();
}

export const listItemActions = {
    list: (
        listId: number,
        page?: number,
        pageSize?: number,
        options?: ListItemQueryOptions
    ): Promise<PaginatedListItemList> => {
        const query = buildListItemQuery(page, pageSize, options);
        return api.get<PaginatedListItemList>(
            `/content/lists/${listId}/items/${query ? `?${query}` : ""}`,
            true
        );
    },

    listAll: (
        listId: number,
        options?: ListItemQueryOptions
    ): Promise<ListItem[]> => {
        const query = buildListItemQuery(undefined, 0, options);
        return api.get<ListItem[]>(
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
