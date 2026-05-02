import { useQuery } from "@tanstack/react-query";

import { contentItemActions } from "@/lib/api";
import type { ContentType } from "@/lib/types";
import { queryKeys } from "./keys";

interface UseContentItemResolutionQueryOptions {
  country?: string | null;
  enabled?: boolean;
}

export function useContentItemResolutionQuery(
  externalId: string,
  contentType: ContentType,
  { country, enabled = true }: UseContentItemResolutionQueryOptions = {},
) {
  return useQuery({
    queryKey: queryKeys.contentResolution.byExternal(
      externalId,
      contentType,
      country ?? null,
    ),
    queryFn: () =>
      contentItemActions.getOrCreate(
        externalId,
        contentType,
        country ?? undefined,
      ),
    enabled: enabled && Boolean(externalId) && Boolean(contentType),
    staleTime: 5 * 60_000,
  });
}
