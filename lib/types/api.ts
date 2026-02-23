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
    member_ratings: MemberRating[];
    list_rating: number | null;
    member_rating_count: number;
}

export interface ListItemCreate {
    source_api: SourceApi;
    external_id: string;
    content_type: ContentType;
    status: ItemStatus;
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
    name: string;
    image_url: string | null;
}

export interface SearchItem {
    id: string;
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
    season_number: number;
    title: string;
    description: string | null;
    release_date: string | null;
    image_url: string | null;
    number_of_episodes: number;
}

export interface TVSeasonDetail {
    id: string;
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

export interface GameDetail {
    id: string;
    type: "GAME";
    title: string;
    game_type: string | null;
    release_date: string | null;
    description: string | null;
    image_url: string | null;
    authors: Author[] | null;
    platforms: Platform[] | null;
    images: Image[];
    genres: string[];
    themes: string[];
    game_modes: string[];
    series: string | null;
    play_time: GamePlayTime | null;
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
    status: ItemStatus;
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
