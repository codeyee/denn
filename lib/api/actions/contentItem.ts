import { api } from "../api";
import { buildQueryString, addCountryParam } from "../utils/queryParams";
import { getSourceApi } from "@/lib/utils/contentTypeUtils";
import type {
  ContentItem,
  PaginatedContentItemList,
  ContentItemQueryParams,
  ContentType,
  SourceApi,
} from "@/lib/types";

export const contentItemActions = {
  list: (params?: ContentItemQueryParams): Promise<PaginatedContentItemList> => {
    const query = buildQueryString({
      params,
      addCountry: true,
      country: params?.country,
    });
    return api.get<PaginatedContentItemList>(`/content/items/${query}`, true);
  },

  get: (id: number, country?: string): Promise<ContentItem> => {
    const query = buildQueryString({ addCountry: true, country });
    return api.get<ContentItem>(`/content/items/${id}/${query}`, true);
  },

  create: (item: Partial<ContentItem>): Promise<ContentItem> => {
    return api.post<ContentItem>("/content/items/", item, true);
  },

  update: (id: number, item: Partial<ContentItem>): Promise<ContentItem> => {
    return api.put<ContentItem>(`/content/items/${id}/`, item, true);
  },

  patch: (id: number, item: Partial<ContentItem>): Promise<ContentItem> => {
    return api.patch<ContentItem>(`/content/items/${id}/`, item, true);
  },

  delete: (id: number): Promise<void> => {
    return api.delete(`/content/items/${id}/`, true) as Promise<void>;
  },

  findByExternalId: (
    externalId: string,
    sourceApi?: SourceApi,
    contentType?: ContentType,
    page?: number,
    pageSize?: number
  ): Promise<PaginatedContentItemList> => {
    const params = new URLSearchParams();
    params.append("external_id", externalId);
    if (sourceApi) params.append("source_api", sourceApi);
    if (contentType) params.append("content_type", contentType);
    if (page) params.append("page", String(page));
    if (pageSize) params.append("page_size", String(pageSize));

    return api.get<PaginatedContentItemList>(
      `/content/items/by_external_id/?${params}`,
      true
    );
  },

  getOrCreate: (
    externalId: string,
    contentType: ContentType,
    country?: string
  ): Promise<ContentItem> => {
    const params = new URLSearchParams();
    const normalizedType = contentType.toUpperCase() as ContentType;
    params.append("source_api", getSourceApi(normalizedType));
    params.append("external_id", externalId);
    params.append("content_type", normalizedType);
    addCountryParam(params, country);

    return api.post<ContentItem>(
      `/content/items/get_or_create/?${params}`,
      {},
      true
    );
  },
};
