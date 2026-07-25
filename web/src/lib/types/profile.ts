import type {
  ContentType,
  ListType,
  ListVisibility,
  PaginationMetadata,
} from "./api";

export type ProfileTab = "overview" | "completed" | "ratings" | "lists";

export interface LocalContentSummary {
  id: number;
  type: ContentType;
  title: string;
  subtitle: string | null;
  date: string | null;
  poster: string | null;
  backdrop: string | null;
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
  status: "PENDING" | "COMPLETED";
  added_at: string;
  completed_at: string | null;
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
      tab: "completed";
      data: PaginatedProfileResults<PublicCompletedItem>;
    }
  | {
      tab: "ratings";
      data: PaginatedProfileResults<PublicRatingItem>;
    }
  | {
      tab: "lists";
      data: PaginatedProfileResults<PublicListSummary>;
    };

export interface ProfileSearchParams {
  tab: ProfileTab;
  type?: Exclude<ContentType, ContentType.PERSON>;
  q?: string;
  sort?: string;
  page: number;
  kind?: "all" | "reviews" | "ratings_only";
  favorite?: boolean;
  minScore?: number;
  maxScore?: number;
  role?: "all" | "owner" | "member";
}

export interface PublicProfileUpdate {
  bio: string;
  avatar_url: string;
}
