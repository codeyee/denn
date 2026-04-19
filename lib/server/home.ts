import "server-only";

import { headers } from "next/headers";
import { getApiUrl, getProxyApiUrl } from "@/lib/env";
import { buildProxyHeaders, generateRequestId } from "@/lib/server/proxy";
import type { HomepageResponse, ListWithItems, PaginatedUserListList } from "@/lib/types";
import type { SessionSnapshot } from "@/lib/auth/session-server";

async function inboundRequestId(): Promise<string> {
  try {
    const h = await headers();
    return h.get("x-request-id") ?? generateRequestId();
  } catch {
    return generateRequestId();
  }
}

const SUGGESTIONS_PAGE_SIZE = 20;
const LISTS_ITEMS_SIZE = 8;
const LISTS_IMAGES_SIZE = 4;

export interface HomePageData {
  suggestions: HomepageResponse | null;
  suggestionsError: string | null;
  lists: ListWithItems[];
  listsError: string | null;
}

const EMPTY_HOME_DATA: HomePageData = {
  suggestions: null,
  suggestionsError: null,
  lists: [],
  listsError: null,
};

async function fetchSuggestions(country: string | null, requestId: string): Promise<HomepageResponse> {
  const searchParams = new URLSearchParams({
    limit: String(SUGGESTIONS_PAGE_SIZE),
  });

  const response = await fetch(`${getProxyApiUrl()}/homepage?${searchParams.toString()}`, {
    headers: buildProxyHeaders(country, { requestId }),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch homepage suggestions (${response.status})`);
  }

  return response.json() as Promise<HomepageResponse>;
}

async function fetchLists(
  accessToken: string,
  country: string | null,
  requestId: string
): Promise<ListWithItems[]> {
  const searchParams = new URLSearchParams({
    items_size: String(LISTS_ITEMS_SIZE),
    images_size: String(LISTS_IMAGES_SIZE),
    fields: [
      "id",
      "name",
      "item_count",
      "member_count",
      "list_type",
      "items.id",
      "items.content_item.source_data",
    ].join(","),
    source_fields: ["id", "images"].join(","),
  });

  if (country) {
    searchParams.set("country", country);
  }

  const response = await fetch(`${getApiUrl()}/content/lists/?${searchParams.toString()}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "X-Request-Id": requestId,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch user lists (${response.status})`);
  }

  const data = (await response.json()) as PaginatedUserListList;
  return (data.results ?? []) as ListWithItems[];
}

export async function getHomePageData(
  session: SessionSnapshot,
  country: string | null
): Promise<HomePageData> {
  if (!session.isAuthenticated || !session.accessToken) {
    return EMPTY_HOME_DATA;
  }

  const requestId = await inboundRequestId();

  const [suggestionsResult, listsResult] = await Promise.allSettled([
    fetchSuggestions(country, requestId),
    fetchLists(session.accessToken, country, requestId),
  ]);

  return {
    suggestions:
      suggestionsResult.status === "fulfilled" ? suggestionsResult.value : null,
    suggestionsError:
      suggestionsResult.status === "rejected"
        ? suggestionsResult.reason instanceof Error
          ? suggestionsResult.reason.message
          : "Failed to load homepage suggestions"
        : null,
    lists: listsResult.status === "fulfilled" ? listsResult.value : [],
    listsError:
      listsResult.status === "rejected"
        ? listsResult.reason instanceof Error
          ? listsResult.reason.message
          : "Failed to load user lists"
        : null,
  };
}
