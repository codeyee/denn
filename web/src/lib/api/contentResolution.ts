import {
  getSourceApi,
  normalizeContentType,
} from "@/lib/utils/contentTypeUtils";
import {
  ContentType,
  type HomepageResponse,
  type MultiSearchResponse,
  type SearchItem,
} from "@/lib/types";

type ResolvableContent = SearchItem;

export interface ResolvedContentIdentity {
  id: number;
  source_api: string;
  external_id: string;
  content_type: ContentType;
}

export function collectContentIdentities(
  response: HomepageResponse | MultiSearchResponse,
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
  T extends HomepageResponse | MultiSearchResponse,
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
  response: HomepageResponse | MultiSearchResponse,
): ResolvableContent[] {
  const unique = new Map<string, ResolvableContent>();
  for (const category of Object.values(response)) {
    for (const item of category.results) {
      unique.set(identityKey(String(item.id), item.type), item);
    }
  }
  return [...unique.values()];
}

function mapResponseItems<T extends HomepageResponse | MultiSearchResponse>(
  response: T,
  mapItem: (item: ResolvableContent) => ResolvableContent,
): T {
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

function identityKey(externalId: string, contentType: ContentType) {
  return `${contentType}:${externalId}`;
}
