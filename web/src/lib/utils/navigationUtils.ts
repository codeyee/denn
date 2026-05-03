import { ContentType, SourceApi } from "@/lib/types";
import type { useNavigate } from "@tanstack/react-router";
import { getSourceApi, isValidContentType } from "./contentTypeUtils";

export type NavigateFn = ReturnType<typeof useNavigate>;

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

const _legacyUrlWarned = new Set<string>();

function warnLegacyContentUrl(caller: string): void {
  if (process.env.NODE_ENV === "production") return;
  if (_legacyUrlWarned.has(caller)) return;
  _legacyUrlWarned.add(caller);
  console.warn(
    `[navigationUtils] ${caller} is deprecated as of Sprint 07. ` +
      "Resolve the ContentItem via contentItemActions.getOrCreate(...) " +
      "and link to /content/<id> using buildContentUrlById(id). The legacy " +
      "URL still works via a 301 redirect but adds a round-trip.",
  );
}

function openInNewTab(url: string, background?: boolean): void {
  const newWindow = window.open(url, "_blank");
  if (background && newWindow) {
    window.focus();
  }
}

function navigateWithRouter(
  navigate: NavigateFn,
  url: string,
  replace?: boolean,
): void {
  void navigate({ to: url, replace });
}

export function buildContentUrlById(id: number): string {
  return `/content/${id}`;
}

export function navigateToContentById(
  navigate: NavigateFn,
  id: number,
  options?: NavigationOptions,
): void {
  const url = buildContentUrlById(id);

  if (options?.newTab) {
    openInNewTab(url, options.background);
  } else {
    navigateWithRouter(navigate, url, options?.replace);
  }
}

/**
 * @deprecated Use `buildContentUrlById(id)` after resolving the item via
 * `contentItemActions.getOrCreate`. This URL form forces the backend to
 * issue a `301` redirect on the next request and adds a render flash.
 */
export function buildContentUrl(params: ContentUrlParams): string {
  warnLegacyContentUrl("buildContentUrl");
  const searchParams = new URLSearchParams({
    external_id: params.externalId,
    source_api: params.sourceApi,
    content_type: params.contentType,
  });

  return `/content?${searchParams.toString()}`;
}

/**
 * @deprecated Use `buildContentUrlById(id)` instead. See `buildContentUrl`.
 */
export function buildContentUrlSimple(
  externalId: string,
  contentType: ContentType | string,
): string {
  warnLegacyContentUrl("buildContentUrlSimple");
  const sourceApi = getSourceApi(contentType);
  const validContentType = isValidContentType(contentType)
    ? contentType
    : ContentType.MOVIE;

  const searchParams = new URLSearchParams({
    external_id: externalId,
    source_api: sourceApi,
    content_type: validContentType,
  });
  return `/content?${searchParams.toString()}`;
}

/**
 * @deprecated Use `navigateToContentById` after `contentItemActions.getOrCreate`.
 */
export function navigateToContent(
  navigate: NavigateFn,
  params: ContentUrlParams,
  options?: NavigationOptions,
): void {
  const url = buildContentUrl(params);

  if (options?.newTab) {
    openInNewTab(url, options.background);
  } else {
    navigateWithRouter(navigate, url, options?.replace);
  }
}

export function buildListUrl(listId: number | string): string {
  return `/lists/${listId}`;
}

export function navigateToList(
  navigate: NavigateFn,
  listId: number | string,
  options?: NavigationOptions,
): void {
  const url = buildListUrl(listId);

  if (options?.newTab) {
    openInNewTab(url, options.background);
  } else {
    navigateWithRouter(navigate, url, options?.replace);
  }
}

export function buildSearchUrl(query: string, contentType?: ContentType): string {
  const params = new URLSearchParams({ q: query });
  if (contentType) {
    params.set("type", contentType);
  }
  return `/search?${params.toString()}`;
}
