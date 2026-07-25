import { useQuery } from "@tanstack/react-query";

import { profileActions } from "@/lib/api";
import type {
  PaginatedProfileResults,
  ProfileSearchParams,
  PublicCompletedItem,
  PublicListSummary,
  PublicProfileOverview,
  PublicRatingItem,
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

export function usePublicCompletedQuery(
  username: string,
  search: ProfileSearchParams,
  initialData?: PaginatedProfileResults<PublicCompletedItem>,
) {
  return useQuery({
    queryKey: queryKeys.profiles.tab(username, "completed", search),
    queryFn: () => profileActions.completed(username, search),
    staleTime: 60_000,
    initialData,
  });
}

export function usePublicRatingsQuery(
  username: string,
  search: ProfileSearchParams,
  initialData?: PaginatedProfileResults<PublicRatingItem>,
) {
  return useQuery({
    queryKey: queryKeys.profiles.tab(username, "ratings", search),
    queryFn: () => profileActions.ratings(username, search),
    staleTime: 60_000,
    initialData,
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
  });
}
