/**
 * Sprint 08 / T6 — TanStack Query key factory.
 *
 * Centralising keys here gives us:
 *   - typed access from any caller (no copy/paste typos),
 *   - one place to update if the URL shape changes,
 *   - and a clean way to invalidate by prefix
 *     (e.g. `qc.invalidateQueries({ queryKey: queryKeys.lists.all })`).
 *
 * Every key is a tuple where the first element is the resource family
 * and subsequent elements are query parameters. This matches TanStack
 * Query's idiomatic pattern.
 */

import type { ListItemQuery } from "@/lib/types/listView";
import type { BulkCheckItem } from "@/lib/types";
import type { ProfileSearchParams, ProfileTab } from "@/lib/types";
import { profileDataSearchParams } from "@/lib/profileSearch";

interface ListItemsParams {
  page?: number;
  pageSize?: number;
  options?: {
    country?: string;
    fields?: string;
    expand?: string;
    omit?: string;
    source_fields?: string;
    query?: Pick<ListItemQuery, "filters" | "rangeFilters" | "sort" | "groupBy">;
  };
}

export const queryKeys = {
  suggestions: {
    all: ["suggestions"] as const,
    byParams: (params: { limit: number; country?: string | null }) =>
      ["suggestions", params] as const,
  },
  search: {
    all: ["search"] as const,
    multi: (params: {
      query: string;
      limit: number;
      country?: string | null;
      allowAdult: boolean;
    }) =>
      ["search", "multi", params] as const,
  },
  lists: {
    all: ["lists"] as const,
    publicDetail: (id: number) => ["lists", "public-detail", id] as const,
    list: (params?: Record<string, unknown>) =>
      ["lists", "list", params ?? null] as const,
    detail: (id: number, params?: Record<string, unknown>) =>
      ["lists", "detail", id, params ?? null] as const,
    stats: (id: number) => ["lists", "stats", id] as const,
    bulkCheck: (items: BulkCheckItem[]) =>
      ["lists", "bulk-check", items] as const,
  },
  listItems: {
    all: (listId: number) => ["list-items", listId] as const,
    page: (listId: number, params: ListItemsParams) =>
      ["list-items", listId, params] as const,
    full: (listId: number, params?: ListItemsParams["options"]) =>
      ["list-items", listId, "full", params ?? null] as const,
  },
  dynamicCollections: {
    all: ["dynamic-collections"] as const,
    items: (key: string, params?: Record<string, unknown>) =>
      ["dynamic-collections", "items", key, params ?? null] as const,
  },
  contentDetail: {
    all: ["content-detail"] as const,
    byId: (
      id: number,
      viewerId: number | "anonymous",
      country?: string,
    ) =>
      ["content-detail", viewerId, id, country ?? null] as const,
  },
  contentResolution: {
    byExternal: (
      externalId: string,
      contentType: string,
      country?: string | null,
    ) => ["content-resolution", externalId, contentType, country ?? null] as const,
  },
  ratings: {
    all: ["ratings"] as const,
    list: (contentItemId: number, page: number, pageSize: number) =>
      ["ratings", "list", contentItemId, page, pageSize] as const,
    byUser: (contentItemId: number, userId: number) =>
      ["ratings", "user", contentItemId, userId] as const,
  },
  profiles: {
    all: ["profiles"] as const,
    overview: (username: string) =>
      ["profiles", username, "overview"] as const,
    tab: (
      username: string,
      tab: Exclude<ProfileTab, "overview">,
      params: Partial<ProfileSearchParams>,
    ) => ["profiles", username, tab, profileRequestParams(params)] as const,
  },
} as const;

function profileRequestParams(params: Partial<ProfileSearchParams>) {
  return profileDataSearchParams(params as ProfileSearchParams);
}
