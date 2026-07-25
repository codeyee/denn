import { api } from "../api";
import { buildQueryString } from "../utils/queryParams";
import type {
  PaginatedProfileResults,
  ProfileSearchParams,
  PublicCompletedItem,
  PublicListSummary,
  PublicProfileIdentity,
  PublicProfileOverview,
  PublicProfileUpdate,
  PublicRatingItem,
} from "@/lib/types";

type ProfilePageResult =
  | PublicCompletedItem
  | PublicRatingItem
  | PublicListSummary;

export const profileActions = {
  overview: (username: string): Promise<PublicProfileOverview> =>
    api.get<PublicProfileOverview>(`/profiles/${encodeURIComponent(username)}/`),

  completed: (
    username: string,
    params: Partial<ProfileSearchParams>,
  ): Promise<PaginatedProfileResults<PublicCompletedItem>> =>
    profilePage<PublicCompletedItem>(username, "completed", params),

  ratings: (
    username: string,
    params: Partial<ProfileSearchParams>,
  ): Promise<PaginatedProfileResults<PublicRatingItem>> =>
    profilePage<PublicRatingItem>(username, "ratings", params),

  lists: (
    username: string,
    params: Partial<ProfileSearchParams>,
  ): Promise<PaginatedProfileResults<PublicListSummary>> =>
    profilePage<PublicListSummary>(username, "lists", params),

  updateMe: (data: PublicProfileUpdate): Promise<PublicProfileIdentity> =>
    api.patch<PublicProfileIdentity>("/profiles/me/", data, true),
};

function profilePage<T extends ProfilePageResult>(
  username: string,
  tab: "completed" | "ratings" | "lists",
  params: Partial<ProfileSearchParams>,
) {
  const query = buildQueryString({
    params: {
      ...params,
      tab: undefined,
      favorite:
        params.favorite === undefined ? undefined : String(params.favorite),
      minScore: params.minScore,
      maxScore: params.maxScore,
    },
  });
  return api.get<PaginatedProfileResults<T>>(
    `/profiles/${encodeURIComponent(username)}/${tab}/${query}`,
  );
}
