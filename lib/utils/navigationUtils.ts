/**
 * Navigation Utilities
 *
 * Centralized URL construction and navigation helpers to eliminate
 * duplicated navigation logic across the codebase.
 *
 * This utility eliminates 4+ instances of duplicated URL construction
 * and navigation handling.
 */

import { ContentType, SourceApi } from '@/lib/api/types';
import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';

/**
 * Parameters for building content URLs
 */
export interface ContentUrlParams {
  externalId: string;
  sourceApi: SourceApi;
  contentType: ContentType;
}

/**
 * Build a content detail page URL with query parameters
 *
 * @param params - Content identification parameters
 * @returns The constructed URL path with query string
 *
 * @example
 * ```ts
 * const url = buildContentUrl({
 *   externalId: '12345',
 *   sourceApi: SourceApi.TMDB,
 *   contentType: ContentType.MOVIE
 * });
 * // Returns: '/content?external_id=12345&source_api=tmdb&content_type=MOVIE'
 * ```
 */
export function buildContentUrl(params: ContentUrlParams): string {
  const searchParams = new URLSearchParams({
    external_id: params.externalId,
    source_api: params.sourceApi,
    content_type: params.contentType,
  });

  return `/content?${searchParams.toString()}`;
}

/**
 * Options for content navigation
 */
export interface NavigationOptions {
  /**
   * Open in new tab
   */
  newTab?: boolean;

  /**
   * Open in background (requires newTab: true)
   * When true, the new tab opens but focus stays on current tab
   */
  background?: boolean;

  /**
   * Use replace instead of push (stays in same history entry)
   */
  replace?: boolean;
}

/**
 * Navigate to a content detail page
 *
 * Handles both same-tab navigation and new tab opening with
 * optional background tab support.
 *
 * @param router - Next.js App Router instance
 * @param params - Content identification parameters
 * @param options - Navigation options
 *
 * @example
 * ```ts
 * // Same tab navigation
 * navigateToContent(router, {
 *   externalId: '12345',
 *   sourceApi: SourceApi.TMDB,
 *   contentType: ContentType.MOVIE
 * });
 *
 * // New tab (foreground)
 * navigateToContent(router, params, { newTab: true });
 *
 * // New tab (background)
 * navigateToContent(router, params, { newTab: true, background: true });
 * ```
 */
export function navigateToContent(
  router: AppRouterInstance,
  params: ContentUrlParams,
  options?: NavigationOptions
): void {
  const url = buildContentUrl(params);

  if (options?.newTab) {
    const newWindow = window.open(url, '_blank');

    // Focus management for background tabs
    if (options.background && newWindow) {
      newWindow.blur();
      window.focus();
    }
  } else {
    // Same-tab navigation
    if (options?.replace) {
      router.replace(url);
    } else {
      router.push(url);
    }
  }
}

/**
 * Build a list detail page URL
 *
 * @param listId - The list ID
 * @returns The constructed URL path
 *
 * @example
 * ```ts
 * const url = buildListUrl('123');
 * // Returns: '/lists/123'
 * ```
 */
export function buildListUrl(listId: string | number): string {
  return `/lists/${listId}`;
}

/**
 * Navigate to a list detail page
 *
 * @param router - Next.js App Router instance
 * @param listId - The list ID
 * @param options - Navigation options
 *
 * @example
 * ```ts
 * navigateToList(router, '123');
 * navigateToList(router, '123', { newTab: true });
 * ```
 */
export function navigateToList(
  router: AppRouterInstance,
  listId: string | number,
  options?: NavigationOptions
): void {
  const url = buildListUrl(listId);

  if (options?.newTab) {
    const newWindow = window.open(url, '_blank');

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
 * Build a search URL with query parameters
 *
 * @param query - The search query string
 * @param contentType - Optional content type filter
 * @returns The constructed URL path with query string
 *
 * @example
 * ```ts
 * const url = buildSearchUrl('spider-man');
 * // Returns: '/search?q=spider-man'
 *
 * const url = buildSearchUrl('spider-man', ContentType.MOVIE);
 * // Returns: '/search?q=spider-man&type=MOVIE'
 * ```
 */
export function buildSearchUrl(query: string, contentType?: ContentType): string {
  const searchParams = new URLSearchParams({ q: query });

  if (contentType) {
    searchParams.set('type', contentType);
  }

  return `/search?${searchParams.toString()}`;
}

/**
 * Parse content URL parameters from URLSearchParams
 *
 * Useful for extracting content identification from URL query strings
 *
 * @param searchParams - URLSearchParams or object with search params
 * @returns Parsed content URL params or null if invalid
 *
 * @example
 * ```ts
 * const params = parseContentUrlParams(searchParams);
 * if (params) {
 *   // Use params.externalId, params.sourceApi, params.contentType
 * }
 * ```
 */
export function parseContentUrlParams(
  searchParams: URLSearchParams | Record<string, string | string[]>
): ContentUrlParams | null {
  const get = (key: string): string | null => {
    if (searchParams instanceof URLSearchParams) {
      return searchParams.get(key);
    }
    const value = searchParams[key];
    return Array.isArray(value) ? value[0] : value || null;
  };

  const externalId = get('external_id');
  const sourceApi = get('source_api');
  const contentType = get('content_type');

  if (!externalId || !sourceApi || !contentType) {
    return null;
  }

  return {
    externalId,
    sourceApi: sourceApi as SourceApi,
    contentType: contentType as ContentType,
  };
}
