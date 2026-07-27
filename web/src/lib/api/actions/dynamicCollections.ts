import { api } from "../api";
import type {
  DynamicCollectionItem,
  DynamicCollectionItemsResponse,
  DynamicCollectionsResponse,
} from "@/lib/types";

export const dynamicCollectionActions = {
  list: (): Promise<DynamicCollectionsResponse> =>
    api.get("/content/dynamic-collections/", true),
  updateSettings: (data: {
    enabled?: boolean;
    collections?: Array<{ key: string; enabled: boolean }>;
  }): Promise<DynamicCollectionsResponse> =>
    api.patch("/content/dynamic-collections/settings/", data, true),
  items: (key: string, params: { page?: number; pageSize?: number; q?: string; sort?: string } = {}): Promise<DynamicCollectionItemsResponse> => {
    const search = new URLSearchParams();
    if (params.page) search.set("page", String(params.page));
    if (params.pageSize) search.set("page_size", String(params.pageSize));
    if (params.q) search.set("q", params.q);
    if (params.sort) search.set("sort", params.sort);
    const suffix = search.size ? `?${search.toString()}` : "";
    return api.get(`/content/dynamic-collections/${encodeURIComponent(key)}/items/${suffix}`, true);
  },
  pickRandom: (key: string): Promise<{ result: DynamicCollectionItem | null }> =>
    api.post(`/content/dynamic-collections/${encodeURIComponent(key)}/random/`, undefined, true),
};
