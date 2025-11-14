import { ContentType, SourceApi } from "@/lib/api/types";
import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";

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
