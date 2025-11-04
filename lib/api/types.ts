export interface EmailLogin {
  email: string;
  password: string;
}

export interface Register {
  username: string;
  email: string;
  password: string;
  password_confirm: string;
  first_name?: string;
  last_name?: string;
}

export interface JWT {
  access: string;
  refresh: string;
  user: Profile;
}

export interface Profile {
  id: number;
  username: string;
  email: string;
  first_name?: string;
  last_name?: string;
  lists?: string;
  ratings?: string;
  lists_count?: number;
  ratings_count?: number;
}

export interface TokenRefresh {
  access: string;
  refresh: string;
}

export interface TokenVerify {
  token: string;
}

export interface PasswordChange {
  new_password1: string;
  new_password2: string;
}

export interface PasswordReset {
  email: string;
}

export interface PasswordResetConfirm {
  uid: string;
  token: string;
  new_password1: string;
  new_password2: string;
}

export enum SourceApi {
  TMDB = "tmdb",
  IGDB = "igdb",
  SPOTIFY = "spotify",
  OPENLIBRARY = "openlibrary",
}

export enum ContentType {
  MOVIE = "MOVIE",
  TV_SHOW = "TV_SHOW",
  SEASON = "SEASON",
  GAME = "GAME",
  ALBUM = "ALBUM",
  BOOK = "BOOK",
}

export interface ContentItem {
  id: number;
  source_api: SourceApi;
  external_id: string;
  content_type: ContentType;
  rating_count: number;
  average_rating: string | null;
  created_at: string;
  source_data?: string;
}

export enum ListType {
  PERSONAL = "PERSONAL",
  SHARED = "SHARED",
}

export interface User {
  id: number;
  username: string;
  email: string;
  first_name?: string;
  last_name?: string;
}

export interface UserList {
  id: number;
  name: string;
  description: string | null;
  list_type: ListType;
  owner: User;
  member_count: string;
  item_count: string;
  created_at: string;
  updated_at: string;
}

export interface UserListDetail extends UserList {
  members: User[];
  items: string;
}

export interface ListItem {
  id: number;
  user_list: number;
  list_order: number;
  content_item: string;
  added_by: User;
  status: ItemStatus;
  added_at: string;
  completed_at: string | null;
  notes: string | null;
  member_ratings: string;
  list_rating: string;
  member_rating_count: string;
}

export interface ListItemCreate {
  source_api: SourceApi;
  external_id: string;
  content_type: ContentType;
  status: ItemStatus;
  notes?: string | null;
}

export enum ItemStatus {
  PENDING = "PENDING",
  COMPLETED = "COMPLETED",
}

export interface ListInvitation {
  id: number;
  user_list: UserList;
  inviter: User;
  invitee: User;
  status: InvitationStatus;
  created_at: string;
  responded_at: string | null;
}

export interface ListInvitationCreate {
  username?: string;
  email?: string;
}

export interface ListInvitationResponse {
  id?: number;
  action: "accept" | "reject";
  status?: InvitationStatus;
  responded_at?: string | null;
}

export enum InvitationStatus {
  PENDING = "PENDING",
  ACCEPTED = "ACCEPTED",
  REJECTED = "REJECTED",
}

export interface Rating {
  id: number;
  user: User;
  content_item: ContentItem;
  score: string;
  comment: string | null;
  created_at: string;
  updated_at: string;
}

export interface RatingCreate {
  source_api: SourceApi;
  external_id: string;
  content_type: ContentType;
  score: string;
  comment?: string | null;
}

export interface VideoSearchItem {
  id: number;
  type: "movie" | "tv";
  title: string;
  original_title: string;
  description: string | null;
  image_url: string | null;
  release_date: string | null;
}

export interface ImageVariant {
  standard: string;
  original: string;
}

export interface GameImages {
  poster: ImageVariant;
  screenshots: ImageVariant[] | null;
  artworks: ImageVariant[] | null;
}

export interface MovieDetail {
  id: number;
  imdb_id: string;
  title: string;
  original_title: string;
  description: string;
  image_url: string;
  tagline: string;
  release_date: string;
  duration_minutes: number;
  status: string;
  images: {
    poster: ImageVariant;
    backdrop: ImageVariant;
  };
}

export interface TVShowDetail {
  id: number;
  title: string;
  original_title: string;
  description: string;
  image_url: string;
  tagline: string;
  release_date: string;
  status: string;
  number_of_seasons: number;
  number_of_episodes: number;
  images: {
    poster: ImageVariant;
    backdrop: ImageVariant;
  };
  seasons: TVSeason[];
}

export interface TVSeason {
  id: number;
  season_number: number;
  title: string;
  description: string | null;
  release_date: string | null;
  image_url: string;
  number_of_episodes: number;
}

export interface TVSeasonDetail extends TVSeason {
  episodes: TVEpisode[];
}

export interface TVEpisode {
  id: number;
  episode_number: number;
  season_number: number;
  episode_type: string | null;
  title: string;
  description: string | null;
  release_date: string | null;
  duration_minutes: number | null;
  image_url: string | null;
}

export interface VideoSearchResponse {
  metadata: PaginationMetadata;
  results: VideoSearchItem[];
}

export interface VideoSuggestionsResponse {
  results: VideoSearchItem[];
  count: number;
}

export interface BulkMovieItem {
  key: number;
  id: number;
  data: MovieDetail | null;
  status_code: number;
  error: string | null;
}

export interface BulkTVShowItem {
  key: number;
  id: number;
  data: TVShowDetail | null;
  status_code: number;
  error: string | null;
}

export interface BulkSeasonItem {
  tv_id: number;
  season_number: number;
  data: TVSeasonDetail | null;
  status_code: number;
  error: string | null;
}

export interface MusicSearchItem {
  id: string;
  type: "album" | "ep";
  title: string;
  authors: string[];
  image_url: string | null;
  release_date: string | null;
  total_tracks: number;
  album_type: string;
  external_url: string;
}

export interface AlbumDetail {
  id: string;
  title: string;
  authors: string[];
  image_url: string;
  release_date: string;
  total_tracks: number;
  duration_minutes: number;
  album_type: string;
  external_url: string;
  tracks: Track[];
}

export interface Track {
  id: string;
  title: string;
  authors: string[] | null;
  track_number: number;
  duration_seconds: number | null;
  external_url: string;
}

export interface MusicSearchResponse {
  metadata: PaginationMetadata;
  results: MusicSearchItem[];
}

export interface MusicSuggestionsResponse {
  results: MusicSearchItem[];
  count: number;
}

export interface BulkAlbumsResponse {
  albums: (AlbumDetail | null)[];
}

export interface GameDetail {
  id: number;
  title: string;
  type: string;
  release_date: string | null;
  description: string | null;
  image_url: string;
  authors: string[] | null;
  platforms: string[] | null;
  slug: string;
  images: GameImages;
}

export interface GameSearchItem {
  id: number;
  title: string;
  type: string | null;
  release_date: string | null;
  description: string | null;
  image_url: string | null;
  authors: string[] | null;
  platforms: string[] | null;
}

export interface GameSearchResponse {
  metadata: PaginationMetadata;
  results: GameSearchItem[];
}

export interface GamesSuggestionsResponse {
  results: GameSearchItem[];
  count: number;
}

export interface BookDetail {
  id: string;
  title: string;
  authors: string[];
  image_url: string;
  release_date: string;
  pages: number;
  description: string | null;
}

export interface BookSearchItem {
  id: string;
  title: string;
  authors: string[] | null;
  image_url: string | null;
  release_date: string | null;
  pages: number | null;
  description: string | null;
}

export interface BookSearchResponse {
  metadata: PaginationMetadata;
  results: BookSearchItem[];
}

export interface BooksSuggestionsResponse {
  results: BookSearchItem[];
  count: number;
}

export interface BulkBookItem {
  key: string;
  data: BookDetail | null;
  status_code: number;
  error: string | null;
}

export interface HomepageResponse {
  movies: MovieDetail[];
  tv_shows: TVShowDetail[];
  games: GameDetail[];
  music: AlbumDetail[];
  books: BookDetail[];
}

export interface PaginationMetadata {
  page: number;
  page_results: number;
  total_pages: number;
  total_results: number;
}

export interface PaginatedContentItemList {
  count: number;
  next: string | null;
  previous: string | null;
  results: ContentItem[];
}

export interface PaginatedUserListList {
  count: number;
  next: string | null;
  previous: string | null;
  results: UserList[];
}

export interface PaginatedListItemList {
  count: number;
  next: string | null;
  previous: string | null;
  results: ListItem[];
}

export interface PaginatedListInvitationList {
  count: number;
  next: string | null;
  previous: string | null;
  results: ListInvitation[];
}

export interface PaginatedRatingList {
  count: number;
  next: string | null;
  previous: string | null;
  results: Rating[];
}

export interface ErrorResponse {
  error: string;
  message: string;
}

export interface RestAuthDetail {
  detail: string;
}

export interface ListQueryParams {
  page?: number;
  page_size?: number;
  render_items?: boolean;
  max_items?: number;
  render_source?: boolean;
}

export interface ContentItemQueryParams {
  page?: number;
  page_size?: number;
  search?: string;
  content_type?: ContentType;
  source_api?: SourceApi;
  external_id?: string;
  ordering?: string;
  render_source?: boolean;
}

export interface RatingQueryParams {
  page?: number;
  page_size?: number;
  content_item_id?: number;
  user_id?: number;
  source_api?: SourceApi;
  external_id?: string;
  stats_only?: boolean;
}

export interface InvitationQueryParams {
  page?: number;
  page_size?: number;
  list_id?: number;
  sent?: boolean;
  status?: InvitationStatus;
}

export interface VideoSearchParams {
  query: string;
  page?: number;
  limit?: number;
}

export interface GameSearchParams {
  query: string;
  page?: number;
  limit?: number;
}

export interface MusicSearchParams {
  query: string;
  offset?: number;
  limit?: number;
  min_tracks?: number;
}

export interface BookSearchParams {
  query: string;
  page?: number;
  limit?: number;
}
