import {
  getSourceApi,
  normalizeContentType,
} from "@/lib/utils/contentTypeUtils";
import {
  ContentType,
  type BrowseResponse,
  type HomepageResponse,
  type MultiSearchResponse,
  type SearchItem,
} from "@/lib/types";

type ResolvableContent = SearchItem;

export type CatalogResponse = HomepageResponse | MultiSearchResponse | BrowseResponse;

export interface ResolvedContentIdentity {
  id: number;
  source_api: string;
  external_id: string;
  content_type: ContentType;
}

export function collectContentIdentities(
  response: CatalogResponse,
) {
  return collectItems(response)
    .map((item) => ({
      item,
      contentType: normalizeContentType(item.type),
    }))
    .filter(
      (
        entry,
      ): entry is { item: ResolvableContent; contentType: ContentType } =>
        entry.contentType !== null &&
        entry.contentType !== ContentType.PERSON,
    )
    .map(({ item, contentType }) => ({
      source_api: getSourceApi(contentType),
      external_id: String(item.id),
      content_type: contentType,
    }));
}

export function applyResolvedContentIds<
  T extends CatalogResponse,
>(
  response: T,
  resolved: ResolvedContentIdentity[],
): T {
  const ids = new Map(
    resolved.map((item) => [
      identityKey(item.external_id, item.content_type),
      item.id,
    ]),
  );

  return mapResponseItems(response, (item) => {
    const contentType = normalizeContentType(item.type);
    return {
      ...item,
      denn_id:
        contentType && contentType !== ContentType.PERSON
          ? ids.get(identityKey(String(item.id), contentType))
          : undefined,
    };
  });
}

function collectItems(
  response: CatalogResponse,
): ResolvableContent[] {
  const unique = new Map<string, ResolvableContent>();
  if (isBrowseResponse(response)) {
    for (const item of response.results) {
      unique.set(identityKey(String(item.id), item.type), item);
    }
    return [...unique.values()];
  }
  for (const category of Object.values(response)) {
    for (const item of category.results) {
      unique.set(identityKey(String(item.id), item.type), item);
    }
  }
  return [...unique.values()];
}

function mapResponseItems<T extends CatalogResponse>(
  response: T,
  mapItem: (item: ResolvableContent) => ResolvableContent,
): T {
  if (isBrowseResponse(response)) {
    return {
      ...response,
      results: response.results.map(mapItem),
    } as T;
  }

  return Object.fromEntries(
    Object.entries(response).map(([key, category]) => [
      key,
      {
        ...category,
        results: category.results.map(mapItem),
      },
    ]),
  ) as T;
}

export function isBrowseResponse(response: CatalogResponse): response is BrowseResponse {
  return "type" in response && Array.isArray(response.results);
}

function identityKey(externalId: string, contentType: ContentType) {
  return `${contentType}:${externalId}`;
}
