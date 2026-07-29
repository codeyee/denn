import type { MemberRating } from "./listView";
import type { LocalContentSummary } from "./profile";

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
    allow_adult_content?: boolean;
    bio?: string;
    avatar_url?: string;
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
    POSTER = "poster",
    GALLERY = "gallery",
}

export enum ImageSize {
    STANDARD = "standard",
    ORIGINAL = "original",
}

export enum PlatformAction {
    STREAM = "stream",
    RENT = "rent",
    BUY = "buy",
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
    current_user_rating: Rating | null;
    current_user_tracking: UserContentTracking | null;
    progress_policy: ProgressPolicy;
    created_at: string;
    source_data?: SourceData | string | null;
}

export enum ListType {
    PERSONAL = "PERSONAL",
    SHARED = "SHARED",
    DYNAMIC = "DYNAMIC",
}

export enum ListVisibility {
    PUBLIC = "PUBLIC",
    PRIVATE = "PRIVATE",
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
    dynamic_key?: string | null;
    visibility: ListVisibility;
    owner: User;
    members?: User[];
    item_count: string;
    created_at: string;
    updated_at: string;
}

export interface UserListDetail extends UserList {
    items?: ListItem[];
}

export interface ListItem {
    id: number;
    user_list: number;
    list_order: number;
    content_item: ContentItemData;
    added_by: User;
    context_status: ItemStatus | null;
    added_at: string;
    context_completed_at: string | null;
    member_ratings: MemberRating[];
    list_rating: number | null;
    member_rating_count: number;
}

export interface ListItemCreate {
    source_api: SourceApi;
    external_id: string;
    content_type: ContentType;
    context_status?: ItemStatus | null;
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
    spoiler: boolean;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface RatingCreate {
    source_api: SourceApi;
    external_id: string;
    content_type: ContentType;
    score: string;
    comment?: string | null;
    spoiler?: boolean;
}

export type TrackingStatus =
    | "backlog"
    | "in_progress"
    | "completed"
    | "on_hold"
    | "dropped";

export interface UserContentTracking {
    content_id: number;
    status: TrackingStatus;
    last_completed_at: string | null;
    is_favorite: boolean;
    favorited_at: string | null;
    created_at: string;
    updated_at: string;
    should_prompt_rating?: boolean;
    effects?: TrackingEffect[];
}

export type DynamicCollectionGroup = "status" | "type";

export interface DynamicCollection {
    key: string;
    list_id: number;
    name: string;
    group: DynamicCollectionGroup;
    item_count: number;
    enabled: boolean;
    random_enabled: boolean;
    cover_images: string[];
}

export interface DynamicCollectionsResponse {
    enabled: boolean;
    collections: DynamicCollection[];
}

export interface DynamicCollectionItem {
    tracking_id: number;
    content: LocalContentSummary;
    status: TrackingStatus;
    last_completed_at: string | null;
    is_favorite: boolean;
    created_at: string;
    updated_at: string;
    progress_policy: ProgressPolicy;
}

export interface DynamicCollectionItemsResponse {
    metadata: PaginationMetadata;
    results: DynamicCollectionItem[];
}

export type TrackingEffect =
    | "rating_archived"
    | "review_archived"
    | "favorite_removed";

export interface ProgressState {
    value: TrackingStatus;
    label: string;
    is_final: boolean;
}

export interface ProgressPolicy {
    content_type: ContentType;
    final_status: TrackingStatus;
    states: ProgressState[];
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
    name: string;
    image_url: string | null;
    id?: string | number | null;
    provider_id?: string | number | null;
    providerId?: string | number | null;
    url?: string | null;
    link?: string | null;
}

export interface SearchItem {
    id: string;
    denn_id?: number;
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
    id: string;
    denn_id?: number;
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
    id: string;
    denn_id?: number;
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
    id: string;
    denn_id: number;
    season_number: number;
    title: string;
    description: string | null;
    release_date: string | null;
    image_url: string | null;
    number_of_episodes: number;
}

export interface TVSeasonDetail {
    id: string;
    denn_id?: number;
    type: "SEASON";
    season_number: number;
    title: string;
    description: string | null;
    image_url: string | null;
    tv_show_name: string | null;
    tv_show_id?: number;
    tv_show_external_id?: string;
    release_date: string | null;
    number_of_episodes: number;
    images: Image[];
    platforms: Record<string, Platform[]> | null;
    episodes: TVEpisode[];
}

export interface TVEpisode {
    id: string;
    episode_number: number;
    season_number: number;
    episode_type: string | null;
    title: string;
    description: string | null;
    release_date: string | null;
    duration_minutes: number | null;
    image_url: string | null;
}

export interface ProxyPaginationMetadata {
    page: number;
    total_results: number;
    total_pages: number;
}

export interface ProxyCategoryResponse<T = SearchItem> {
    results: T[];
    metadata: ProxyPaginationMetadata;
    error: string;
}

export interface VideoSearchResponse {
    metadata: ProxyPaginationMetadata;
    results: SearchItem[];
}

export interface VideoSuggestionsResponse {
    results: SearchItem[];
    count: number;
}

export interface BulkMovieItem {
    key: string;
    id: string;
    data: MovieDetail | null;
    status_code: number;
    error: string | null;
}

export interface BulkTVShowItem {
    key: string;
    id: string;
    data: TVShowDetail | null;
    status_code: number;
    error: string | null;
}

export interface BulkSeasonItem {
    tv_id: string;
    season_number: number;
    data: TVSeasonDetail | null;
    status_code: number;
    error: string | null;
}

export interface AlbumDetail {
    id: string;
    denn_id?: number;
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
    metadata: ProxyPaginationMetadata;
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

export interface GamePlayTime {
    hastily: number;
    normally: number;
    completely: number;
}

export type GameDurationStatus = "matched" | "no_data" | "stale" | "error";

export interface GameDuration {
    source: string;
    status: GameDurationStatus;
    hastily_seconds?: number;
    normally_seconds?: number;
    completely_seconds?: number;
    updated_at?: string;
    sample_count?: number;
}

export interface GameDetail {
    id: string;
    denn_id?: number;
    type: "GAME";
    title: string;
    game_type: string | null;
    release_date: string | null;
    description: string | null;
    image_url: string | null;
    authors: Author[] | null;
    platforms: Platform[] | null;
    distribution_networks?: Platform[] | null;
    images: Image[];
    genres: string[];
    themes: string[];
    game_modes: string[];
    series: string | null;
    play_time: GamePlayTime | null;
    duration?: GameDuration | null;
}

export interface GameSearchResponse {
    metadata: ProxyPaginationMetadata;
    results: SearchItem[];
}

export interface GamesSuggestionsResponse {
    results: SearchItem[];
    count: number;
}

export interface BookDetail {
    id: string;
    denn_id?: number;
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
    metadata: ProxyPaginationMetadata;
    results: SearchItem[];
}

export interface BooksSuggestionsResponse {
    results: SearchItem[];
    count: number;
}

export interface BulkBookItem {
    key: string;
    id: string;
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
    current_user_rating: Rating | null;
    current_user_tracking: UserContentTracking | null;
    progress_policy: ProgressPolicy;
    created_at: string;
    source_data: SourceData;
}

export interface HomepageResponse {
    movies: ProxyCategoryResponse<MovieDetail>;
    "tv-shows": ProxyCategoryResponse<TVShowDetail>;
    games: ProxyCategoryResponse<GameDetail>;
    albums: ProxyCategoryResponse<AlbumDetail>;
    books: ProxyCategoryResponse<BookDetail>;
}

export interface PaginationMetadata {
    count: number;
    page_size: number;
    current_page: number;
    total_pages: number;
    next: string | null;
    previous: string | null;
    /**
     * Present only when `group_by` is active in a list-item request.
     * See Sprint 4.5 query model.
     */
    groups?: Array<{
        key: string;
        label: string;
        count_in_page: number;
        count_global: number;
    }>;
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

export interface ListStatsResponse {
    total_items: number;
    pending_items: number;
    completed_items: number;
    member_count: number;
    content_types: Record<string, number>;
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
    images_size?: number;
    country?: string;
    fields?: string;
    expand?: string;
    omit?: string;
    source_fields?: string;
    filter_external_id?: string;
    filter_source_api?: string;
    filter_content_type?: string;
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
    fields?: string;
    expand?: string;
    omit?: string;
    source_fields?: string;
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
    q: string;
    page?: number;
    limit?: number;
}

export interface GameSearchParams {
    q: string;
    page?: number;
    limit?: number;
}

export interface MusicSearchParams {
    q: string;
    page?: number;
    limit?: number;
}

export interface BookSearchParams {
    q: string;
    page?: number;
    limit?: number;
}

export interface MultiSearchParams {
    q: string;
    types?: string;
    limit?: number;
    adult?: "exclude" | "include";
}

export interface MultiSearchResponse {
    movies: ProxyCategoryResponse<SearchItem>;
    "tv-shows": ProxyCategoryResponse<SearchItem>;
    games: ProxyCategoryResponse<SearchItem>;
    albums: ProxyCategoryResponse<SearchItem>;
    books: ProxyCategoryResponse<SearchItem>;
}

export type ListSummary = Pick<UserList, "id" | "name" | "item_count">;

export interface ListWithItemsPreview extends ListSummary {
    items?: ListItemBasic[];
}

export interface ListItemBasic {
    id: number;
    context_status: ItemStatus | null;
    content_item: ContentItemBasic;
    list_order?: number;
}

export type ContentItemBasic = Pick<
    ContentItemData,
    "id" | "source_api" | "external_id" | "content_type" | "source_data"
>;

export interface ListWithItems extends UserList {
    items?: ListItem[];
}

export interface BulkCheckItem {
    external_id: string;
    source_api: string;
    content_type: string;
}

export interface BulkCheckRequest {
    items: BulkCheckItem[];
}

export interface MatchedItem {
    list_item_id: number;
    content_item_id: number;
    external_id: string;
    source_api: string;
    content_type: string;
}

export interface UserListWithMatches {
    id: number;
    name: string;
    list_type: ListType;
    item_count: number;
    matched_count: number;
    matched_items: MatchedItem[];
}

export interface BulkCheckResponse {
    queried_items_count: number;
    lists: UserListWithMatches[];
}
