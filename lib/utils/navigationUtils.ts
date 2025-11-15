import { ContentType, SourceApi } from "@/lib/types";
import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { getSourceApi, isValidContentType } from "./contentTypeUtils";

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

function openInNewTab(url: string, background?: boolean): void {
  const newWindow = window.open(url, "_blank");
  if (background && newWindow) {
    window.focus();
  }
}

function navigateWithRouter(
  router: AppRouterInstance,
  url: string,
  replace?: boolean
): void {
  if (replace) {
    router.replace(url);
  } else {
    router.push(url);
  }
}

export function buildContentUrl(params: ContentUrlParams): string {
  const searchParams = new URLSearchParams({
    external_id: params.externalId,
    source_api: params.sourceApi,
    content_type: params.contentType,
  });

  return `/content?${searchParams.toString()}`;
}

export function buildContentUrlSimple(
  externalId: string,
  contentType: ContentType | string
): string {
  const sourceApi = getSourceApi(contentType);
  const validContentType = isValidContentType(contentType)
    ? contentType
    : ContentType.MOVIE;

  return buildContentUrl({
    externalId,
    sourceApi,
    contentType: validContentType,
  });
}

export function navigateToContent(
  router: AppRouterInstance,
  params: ContentUrlParams,
  options?: NavigationOptions
): void {
  const url = buildContentUrl(params);

  if (options?.newTab) {
    openInNewTab(url, options.background);
  } else {
    navigateWithRouter(router, url, options?.replace);
  }
}

export function buildListUrl(listId: number | string): string {
  return `/lists/${listId}`;
}

export function navigateToList(
  router: AppRouterInstance,
  listId: number | string,
  options?: NavigationOptions
): void {
  const url = buildListUrl(listId);

  if (options?.newTab) {
    openInNewTab(url, options.background);
  } else {
    navigateWithRouter(router, url, options?.replace);
  }
}

export function buildSearchUrl(query: string, contentType?: ContentType): string {
  const params = new URLSearchParams({ q: query });
  if (contentType) {
    params.set("type", contentType);
  }
  return `/search?${params.toString()}`;
}

function isValidSourceApi(value: string): value is SourceApi {
  return (
    value === SourceApi.TMDB ||
    value === SourceApi.IGDB ||
    value === SourceApi.SPOTIFY ||
    value === SourceApi.OPENLIBRARY
  );
}

export function parseContentUrl(
  searchParams: URLSearchParams
): ContentUrlParams | null {
  const externalId = searchParams.get("external_id");
  const sourceApiParam = searchParams.get("source_api");
  const contentTypeParam = searchParams.get("content_type");

  if (!externalId || !sourceApiParam || !contentTypeParam) {
    return null;
  }

  if (!isValidSourceApi(sourceApiParam)) {
    return null;
  }

  if (!isValidContentType(contentTypeParam)) {
    return null;
  }

  return {
    externalId,
    sourceApi: sourceApiParam,
    contentType: contentTypeParam,
  };
}
