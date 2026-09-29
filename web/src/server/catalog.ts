import {
  applyResolvedContentIds,
  attachModerationSummaries,
  collectContentIdentities,
  isBrowseResponse,
  keepOnlyCurrentSafeHomepageItems,
  type CatalogResponse,
  type ResolvedContentIdentity,
} from "@/lib/api/contentResolution";
import type { HomepageResponse } from "@/lib/types";
import { getApiUrl } from "@/lib/env";
import { getProxyApiKey } from "@/server/proxy";
import { isWebModerationVisibilityEnabled } from "@/server/moderation-visibility-config";

export async function resolveCatalogContentIds<T extends CatalogResponse>(
  response: T,
  country: string | null,
  requestId: string,
  options: { moderation?: "keepOnlyCurrentSafe" | "annotate" } = {},
): Promise<T> {
  const items = collectContentIdentities(response);
  if (items.length === 0) return response;

  const params = new URLSearchParams();
  if (country) params.set("country", country);
  const started = performance.now();
  const upstream = await fetch(
    `${getApiUrl()}/content/resolve-ids/${params.size ? `?${params}` : ""}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": getProxyApiKey(),
        "X-Api-Consumer": "web",
        "X-Request-Id": requestId,
      },
      body: JSON.stringify({ items }),
      cache: "no-store",
      signal: AbortSignal.timeout(5_000),
    },
  );
  const durationMs =
    Math.round((performance.now() - started) * 100) / 100;

  if (!upstream.ok) {
    throw new Error(`Catalog identity resolution failed (${upstream.status})`);
  }

  const resolved = (await upstream.json()) as {
    results: ResolvedContentIdentity[];
  };

  const resolvedResponse = applyResolvedContentIds(response, resolved.results);
  const unresolvedCount = isBrowseResponse(resolvedResponse)
    ? resolvedResponse.results.filter((item) => !item.denn_id).length
    : Math.max(items.length - resolved.results.length, 0);

  console.log(
    JSON.stringify({
      ts: new Date().toISOString(),
      level: "info",
      msg: "outbound_http_request",
      service: "web",
      request_id: requestId,
      target_service: "core",
      path: "/api/content/resolve-ids/",
      status: upstream.status,
      duration_ms: durationMs,
      requested_count: items.length,
      resolved_count: resolved.results.length,
      unresolved_count: unresolvedCount,
    }),
  );

  if (options.moderation === "keepOnlyCurrentSafe" && !isBrowseResponse(resolvedResponse)) {
    return keepOnlyCurrentSafeHomepageItems(
      resolvedResponse as HomepageResponse,
      resolved.results,
    ) as T;
  }

  const catalog =
    options.moderation === "annotate"
      ? attachModerationSummaries(resolvedResponse, resolved.results)
      : resolvedResponse;

  if (isBrowseResponse(catalog)) {
    return {
      ...catalog,
      results: catalog.results.filter((item) => item.denn_id),
    } as T;
  }

  return catalog;
}

export function resolveDiscoveryContentIds<T extends CatalogResponse>(
  response: T,
  country: string | null,
  requestId: string,
  moderationVisibilityEnabled = isWebModerationVisibilityEnabled(),
): Promise<T> {
  return resolveCatalogContentIds(response, country, requestId, {
    moderation: moderationVisibilityEnabled ? "annotate" : undefined,
  });
}

export function resolveHomepageContentIds(
  response: HomepageResponse,
  country: string | null,
  requestId: string,
  moderationVisibilityEnabled = isWebModerationVisibilityEnabled(),
): Promise<HomepageResponse> {
  return resolveCatalogContentIds(response, country, requestId, {
    moderation: moderationVisibilityEnabled ? "keepOnlyCurrentSafe" : undefined,
  });
}
