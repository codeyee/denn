import type {
  Author,
  ContentType,
  ListType,
  ListVisibility,
  PaginationMetadata,
  TrackingStatus,
} from "./api";
import type { BannerMediaTreatment } from "../utils/imageUtils";

export type ProfileTab = "overview" | "progress" | "lists";
export type ProfileContentType = Exclude<`${ContentType}`, "PERSON">;

export interface LocalContentSummary {
  id: number;
  type: ContentType;
  season_number: number | null;
  title: string;
  subtitle: string | null;
  date: string | null;
  poster: string | null;
  backdrop: string | null;
  authors: Author[] | null;
}

export interface PublicProfileIdentity {
  username: string;
  bio: string;
  avatar_url: string;
  joined_at: string;
}

export interface PublicProfileCounters {
  completed: number;
  ratings: number;
  reviews: number;
  public_lists: number;
  completed_by_type: Partial<Record<ContentType, number>>;
}

export interface PublicCompletedItem {
  content: LocalContentSummary;
  completed_at: string | null;
  is_favorite: boolean;
  score: string | null;
}

export interface PublicRatingItem {
  id: number;
  content: LocalContentSummary;
  score: string;
  review: string | null;
  spoiler: boolean;
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
}

export interface PublicProgressRating {
  id: number;
  score: string;
  review: string | null;
  spoiler: boolean;
  created_at: string;
  updated_at: string;
}

export interface PublicProgressItem {
  id: number;
  content: LocalContentSummary;
  status: TrackingStatus;
  completed_at: string | null;
  is_favorite: boolean;
  rating: PublicProgressRating | null;
  created_at: string;
  updated_at: string;
}

export interface PublicListSummary {
  id: number;
  name: string;
  description: string | null;
  list_type: ListType;
  visibility: ListVisibility;
  role: "owner" | "member";
  owner: { username: string };
  collaborators: Array<{ username: string }>;
  item_count: number;
  member_count: number;
  created_at: string;
  updated_at: string;
}

export interface PublicListItem {
  id: number;
  list_order: number;
  context_status: "PENDING" | "COMPLETED" | null;
  added_at: string;
  context_completed_at: string | null;
  content: LocalContentSummary;
}

export interface PublicListDetail {
  id: number;
  name: string;
  description: string | null;
  list_type: ListType;
  visibility: ListVisibility;
  owner: { username: string };
  collaborators: Array<{ username: string }>;
  item_count: number;
  items: PublicListItem[];
  created_at: string;
  updated_at: string;
}

export interface PublicFavorite {
  content: LocalContentSummary;
  favorited_at: string | null;
  score: string | null;
}

export interface ProfileBannerMedia {
  content_id: number;
  type: ContentType;
  image_url: string;
  treatment?: BannerMediaTreatment;
}

export interface PublicProfileOverview {
  profile: PublicProfileIdentity;
  counters: PublicProfileCounters;
  favorites: Partial<Record<ContentType, PublicFavorite[]>>;
  recent_reviews: PublicRatingItem[];
  recent_completed: PublicCompletedItem[];
  public_lists: PublicListSummary[];
  banner_media: ProfileBannerMedia[];
}

export interface PaginatedProfileResults<T> {
  metadata: PaginationMetadata;
  results: T[];
}

export type PublicProfileTabData =
  | {
      tab: "progress";
      data: PaginatedProfileResults<PublicProgressItem>;
    }
  | {
      tab: "lists";
      data: PaginatedProfileResults<PublicListSummary>;
    };

export interface ProfileSearchParams {
  tab: ProfileTab;
  type?: ProfileContentType[];
  q?: string;
  sort?: string;
  order?: "asc" | "desc";
  page: number;
  status?: TrackingStatus[];
  tvKind?: "all" | "series" | "seasons";
  rated?: boolean;
  reviewed?: boolean;
  favorite?: boolean;
  minScore?: number;
  maxScore?: number;
  role?: "all" | "owner" | "member";
  view?: "grid" | "list";
}

export interface PublicProfileUpdate {
  bio: string;
  avatar_url: string;
}
