import { ContentType, SourceApi } from "@/lib/api/types";
import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { getSourceApi } from "./contentTypeUtils";

export interface ContentUrlParams {
    externalId: string;
    sourceApi: SourceApi;
    contentType: ContentType;
}

export interface NavigationOptions {
    newTab?: boolean;
    background?: boolean;
    replace?: boolean;
}

export function buildContentUrl(params: ContentUrlParams): string {
    const searchParams = new URLSearchParams({
        external_id: params.externalId,
        source_api: params.sourceApi,
        content_type: params.contentType,
    });

    return `/content?${searchParams.toString()}`;
}

/**
 * Build content URL from minimal parameters
 * Automatically determines source API from content type
 */
export function buildContentUrlSimple(
    externalId: string,
    contentType: ContentType | string
): string {
    const type = contentType as ContentType;
    const sourceApi = getSourceApi(type);

    return buildContentUrl({
        externalId,
        sourceApi,
        contentType: type,
    });
}

export function navigateToContent(
    router: AppRouterInstance,
    params: ContentUrlParams,
    options?: NavigationOptions
): void {
    const url = buildContentUrl(params);

    if (options?.newTab) {
        const newWindow = window.open(url, "_blank");

        if (options.background && newWindow) {
            newWindow.blur();
            window.focus();
        }
    } else {
        if (options?.replace) {
            router.replace(url);
        } else {
            router.push(url);
        }
    }
}

/**
 * Build a list detail page URL
 */
export function buildListUrl(listId: number | string): string {
    return `/lists/${listId}`;
}

/**
 * Navigate to list detail page
 */
export function navigateToList(
    router: AppRouterInstance,
    listId: number | string,
    options?: NavigationOptions
): void {
    const url = buildListUrl(listId);

    if (options?.newTab) {
        const newWindow = window.open(url, "_blank");
        if (options.background && newWindow) {
            newWindow.blur();
            window.focus();
        }
    } else {
        if (options?.replace) {
            router.replace(url);
        } else {
            router.push(url);
        }
    }
}

/**
 * Build search URL with query parameters
 */
export function buildSearchUrl(query: string, contentType?: ContentType): string {
    const params = new URLSearchParams({ q: query });
    if (contentType) {
        params.set("type", contentType);
    }
    return `/search?${params.toString()}`;
}

/**
 * Parse content URL query parameters
 */
export function parseContentUrl(
    searchParams: URLSearchParams
): ContentUrlParams | null {
    const externalId = searchParams.get("external_id");
    const sourceApi = searchParams.get("source_api") as SourceApi;
    const contentType = searchParams.get("content_type") as ContentType;

    if (!externalId || !sourceApi || !contentType) {
        return null;
    }

    return {
        externalId,
        sourceApi,
        contentType,
    };
}
