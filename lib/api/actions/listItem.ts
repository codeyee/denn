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
import type { ListItemQuery, SortClause } from "@/lib/types/listView";

interface ListItemQueryOptions {
    country?: string;
    fields?: string;
    expand?: string;
    omit?: string;
    source_fields?: string;
    /**
     * Server-side query model (filters, sort, group_by) introduced in Sprint 4.5.
     * `page` and `pageSize` come from the dedicated arguments to keep the
     * action signature backwards-compatible.
     */
    query?: Pick<ListItemQuery, "filters" | "rangeFilters" | "sort" | "groupBy">;
}

function serializeSort(sort: SortClause[]): string | null {
    if (!sort.length) return null;
    return sort
        .map((c) => (c.direction === "desc" ? `-${c.field}` : c.field))
        .join(",");
}

function appendQueryModel(
    params: URLSearchParams,
    query: ListItemQueryOptions["query"]
): void {
    if (!query) return;

    for (const [field, value] of Object.entries(query.filters ?? {})) {
        if (value === undefined || value === null || value === "") continue;
        const serialized = Array.isArray(value)
            ? value.map((v) => String(v)).join(",")
            : String(value);
        params.append(`filter[${field}]`, serialized);
    }

    for (const [field, value] of Object.entries(query.rangeFilters ?? {})) {
        if (value === undefined || value === null || value === "") continue;
        params.append(`filter[${field}]`, String(value));
    }

    const sortStr = serializeSort(query.sort ?? []);
    if (sortStr) params.append("sort", sortStr);

    if (query.groupBy) params.append("group_by", query.groupBy);
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

    appendQueryModel(params, options.query);

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
        const query = buildListItemQuery(undefined, undefined, options);
        const sep = query ? `?${query}&unpaginated=true` : "?unpaginated=true";
        return api.get<ListItem[]>(
            `/content/lists/${listId}/items/${sep}`,
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

    applySortAsListOrder: (
        listId: number,
        sort: SortClause[]
    ): Promise<{ updated: number }> => {
        const sortStr = serializeSort(sort);
        return api.post<{ updated: number }>(
            `/content/lists/${listId}/items/apply-sort/`,
            { sort: sortStr },
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
