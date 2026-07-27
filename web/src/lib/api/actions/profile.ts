import { api } from "../api";
import { buildQueryString } from "../utils/queryParams";
import type {
  PaginatedProfileResults,
  ProfileSearchParams,
  PublicListSummary,
  PublicProgressItem,
  PublicProfileIdentity,
  PublicProfileOverview,
  PublicProfileUpdate,
} from "@/lib/types";

type ProfilePageResult =
  | PublicProgressItem
  | PublicListSummary;

export const profileActions = {
  overview: (username: string): Promise<PublicProfileOverview> =>
    api.get<PublicProfileOverview>(`/profiles/${encodeURIComponent(username)}/`),

  progress: (
    username: string,
    params: Partial<ProfileSearchParams>,
  ): Promise<PaginatedProfileResults<PublicProgressItem>> =>
    profilePage<PublicProgressItem>(username, "progress", params),

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
  tab: "progress" | "lists",
  params: Partial<ProfileSearchParams>,
) {
  const query = buildQueryString({
    params: {
      ...params,
      tab: undefined,
      view: undefined,
      type: params.type?.join(","),
      status: params.status?.join(","),
      favorite:
        params.favorite === undefined ? undefined : String(params.favorite),
      rated: params.rated === undefined ? undefined : String(params.rated),
      reviewed:
        params.reviewed === undefined ? undefined : String(params.reviewed),
      minScore: params.minScore,
      maxScore: params.maxScore,
    },
  });
  return api.get<PaginatedProfileResults<T>>(
    `/profiles/${encodeURIComponent(username)}/${tab}/${query}`,
  );
}
