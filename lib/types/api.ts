import type { MemberRating } from "./listView";

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
  PERSON = "PERSON",
}

export enum AuthorType {
  PERSON = "PERSON",
  COMPANY = "COMPANY",
}

export enum ImageType {
  POSTER = "POSTER",
  GALLERY = "GALLERY",
}

export enum ImageSize {
  STANDARD = "STANDARD",
  ORIGINAL = "ORIGINAL",
}

export enum ProviderAction {
  STREAM = "STREAM",
  RENT = "RENT",
  BUY = "BUY",
}

export enum GameType {
  ORIGINAL = "ORIGINAL",
  REMAKE = "REMAKE",
  REMASTER = "REMASTER",
  STANDALONE_EXPANSION = "STANDALONE_EXPANSION",
}

export enum AlbumType {
  ALBUM = "ALBUM",
  EP = "EP",
  SINGLE = "SINGLE",
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
  members?: User[];
  item_count: string;
  created_at: string;
  updated_at: string;
}

export interface UserListDetail extends UserList {
  items: ListItem[];
}

export interface ListItem {
  id: number;
  user_list: number;
  list_order: number;
  content_item: ContentItemData;
  added_by: User;
  status: ItemStatus;
  added_at: string;
  completed_at: string | null;
  notes: string | null;
  member_ratings: MemberRating[];
  list_rating: number | null;
  member_rating_count: number;
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

export interface Author {
  name: string;
  type: AuthorType;
}

export interface Image {
  type: ImageType;
  size: ImageSize;
  image_url: string;
}

export interface Platform {
  title: string;
  image_url: string | null;
  actions?: ProviderAction[] | null;
}

export interface SearchItem {
  id: number | string;
  type: ContentType;
  title: string;
  original_title?: string | null;
  description?: string | null;
  image_url?: string | null;
  release_date?: string | null;
  authors?: Author[] | null;
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
  type: "MOVIE";
  title: string;
  original_title: string;
  description: string | null;
  image_url: string | null;
  tagline: string | null;
  imdb_id: string | null;
  release_date: string | null;
  duration_minutes: number | null;
  status: string | null;
  authors: Author[] | null;
  images: Image[];
  platforms: Record<string, Platform[]> | null;
}

export interface TVShowDetail {
  id: number;
  type: "TV_SHOW";
  title: string;
  original_title: string;
  description: string | null;
  image_url: string | null;
  tagline: string | null;
  imdb_id: string | null;
  release_date: string | null;
  status: string | null;
  number_of_seasons: number | null;
  number_of_episodes: number | null;
  authors: Author[] | null;
  images: Image[];
  platforms: Record<string, Platform[]> | null;
  seasons: TVSeason[];
}

export interface TVSeason {
  id: number;
  season_number: number;
  title: string;
  description: string | null;
  release_date: string | null;
  image_url: string | null;
  number_of_episodes: number;
}

export interface TVSeasonDetail {
  id: number;
  type: "SEASON";
  season_number: number;
  title: string;
  description: string | null;
  image_url: string | null;
  tv_show_name: string | null;
  release_date: string | null;
  number_of_episodes: number;
  images: Image[];
  platforms: Record<string, Platform[]> | null;
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
  results: SearchItem[];
}

export interface VideoSuggestionsResponse {
  results: SearchItem[];
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

export interface AlbumDetail {
  id: string;
  type: "ALBUM";
  title: string;
  authors: Author[] | null;
  image_url: string | null;
  release_date: string | null;
  total_tracks: number;
  album_type: string;
  external_url: string;
  tracks: Track[];
  duration_minutes: number | null;
  images: Image[];
}

export interface Track {
  id: string;
  title: string;
  authors: Author[] | null;
  track_number: number;
  duration_seconds: number;
  external_url: string;
}

export interface MusicSearchResponse {
  metadata: PaginationMetadata;
  results: SearchItem[];
}

export interface MusicSuggestionsResponse {
  results: SearchItem[];
  count: number;
}

export type BulkMoviesResponse = MovieDetail[];
export type BulkTVShowsResponse = TVShowDetail[];
export type BulkAlbumsResponse = AlbumDetail[];
export type BulkGamesResponse = GameDetail[];
export type BulkBooksResponse = BookDetail[];

export interface GameDetail {
  id: number;
  type: "GAME";
  title: string;
  game_type: string | null;
  release_date: string | null;
  description: string | null;
  image_url: string | null;
  authors: Author[] | null;
  platforms: Platform[] | null;
  images: Image[];
}

export interface GameSearchResponse {
  metadata: PaginationMetadata;
  results: SearchItem[];
}

export interface GamesSuggestionsResponse {
  results: SearchItem[];
  count: number;
}

export interface BookDetail {
  id: string;
  type: "BOOK";
  title: string;
  authors: Author[] | null;
  image_url: string | null;
  release_date: string | null;
  pages: number | null;
  description: string | null;
  images: Image[];
}

export interface BookSearchResponse {
  metadata: PaginationMetadata;
  results: SearchItem[];
}

export interface BooksSuggestionsResponse {
  results: SearchItem[];
  count: number;
}

export interface BulkBookItem {
  key: string;
  data: BookDetail | null;
  status_code: number;
  error: string | null;
}

export type SourceData =
  | MovieDetail
  | TVShowDetail
  | AlbumDetail
  | GameDetail
  | BookDetail
  | TVSeasonDetail;

export interface ContentItemData {
  id: number;
  source_api: SourceApi;
  external_id: string;
  content_type: ContentType;
  rating_count: number;
  average_rating: number | null;
  created_at: string;
  source_data: SourceData;
}

export interface HomepageResponse {
  movies: MovieDetail[];
  tv_shows: TVShowDetail[];
  games: GameDetail[];
  albums: AlbumDetail[];
  books: BookDetail[];
}

export interface PaginationMetadata {
  count: number;
  page_size: number;
  current_page: number;
  total_pages: number;
  next: string | null;
  previous: string | null;
}

export interface PaginatedContentItemList {
  metadata: PaginationMetadata;
  results: ContentItem[];
}

export interface PaginatedUserListList {
  metadata: PaginationMetadata;
  results: UserList[];
}

export interface PaginatedListItemList {
  metadata: PaginationMetadata;
  results: ListItem[];
}

export interface PaginatedListInvitationList {
  metadata: PaginationMetadata;
  results: ListInvitation[];
}

export interface PaginatedRatingList {
  metadata: PaginationMetadata;
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
  items_size?: number;
  country?: string;
}

export interface ContentItemQueryParams {
  page?: number;
  page_size?: number;
  search?: string;
  content_type?: ContentType;
  source_api?: SourceApi;
  external_id?: string;
  ordering?: string;
  country?: string;
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
  page_size?: number;
}

export interface GameSearchParams {
  query: string;
  page?: number;
  page_size?: number;
}

export interface MusicSearchParams {
  query: string;
  page?: number;
  page_size?: number;
}

export interface BookSearchParams {
  query: string;
  page?: number;
  page_size?: number;
}
