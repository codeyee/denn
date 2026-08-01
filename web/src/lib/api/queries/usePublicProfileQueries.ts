import { useQuery } from "@tanstack/react-query";

import { profileActions } from "@/lib/api";
import type {
  PaginatedProfileResults,
  ProfileSearchParams,
  PublicListSummary,
  PublicProgressItem,
  PublicProfileOverview,
} from "@/lib/types";
import { queryKeys } from "./keys";

export function usePublicProfileOverviewQuery(
  username: string,
  initialData?: PublicProfileOverview,
) {
  return useQuery({
    queryKey: queryKeys.profiles.overview(username),
    queryFn: () => profileActions.overview(username),
    staleTime: 60_000,
    initialData,
  });
}

export function usePublicProgressQuery(
  username: string,
  search: ProfileSearchParams,
  initialData?: PaginatedProfileResults<PublicProgressItem>,
  options: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: queryKeys.profiles.tab(username, "progress", search),
    queryFn: () => profileActions.progress(username, search),
    staleTime: 60_000,
    initialData,
    placeholderData: (previousData) => previousData,
    enabled: options.enabled,
  });
}

export function usePublicListsQuery(
  username: string,
  search: ProfileSearchParams,
  initialData?: PaginatedProfileResults<PublicListSummary>,
) {
  return useQuery({
    queryKey: queryKeys.profiles.tab(username, "lists", search),
    queryFn: () => profileActions.lists(username, search),
    staleTime: 60_000,
    initialData,
    placeholderData: (previousData) => previousData,
  });
}
