import { api } from "./api";
import { getSourceApi } from "@/lib/utils/contentTypeUtils";
import type {
  ContentType,
  HomepageResponse,
  MultiSearchResponse,
  SearchItem,
} from "@/lib/types";

type ResolvableContent = SearchItem;

interface ResolvedContentIdentity {
  id: number;
  source_api: string;
  external_id: string;
  content_type: ContentType;
}

interface BulkResolveResponse {
  results: ResolvedContentIdentity[];
}

const CONTENT_TYPES = new Set<ContentType>([
  "MOVIE" as ContentType,
  "TV_SHOW" as ContentType,
  "SEASON" as ContentType,
  "GAME" as ContentType,
  "ALBUM" as ContentType,
  "BOOK" as ContentType,
]);

export async function resolveContentIds<T extends HomepageResponse | MultiSearchResponse>(
  response: T,
  country?: string,
): Promise<T> {
  const items = collectItems(response).filter((item) =>
    CONTENT_TYPES.has(item.type as ContentType),
  );
  if (items.length === 0) return response;

  const query = country ? `?country=${encodeURIComponent(country)}` : "";
  const resolved = await api.post<BulkResolveResponse>(
    `/content/resolve-ids/${query}`,
    {
      items: items.map((item) => ({
        source_api: getSourceApi(item.type as ContentType),
        external_id: String(item.id),
        content_type: item.type as ContentType,
      })),
    },
    true,
  );
  const ids = new Map(
    resolved.results.map((item) => [
      identityKey(item.external_id, item.content_type),
      item.id,
    ]),
  );

  return mapResponseItems(response, (item) => ({
    ...item,
    denn_id: ids.get(
      identityKey(String(item.id), item.type as ContentType),
    ),
  }));
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
