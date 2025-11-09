import { api } from "./api";
import { getUserCountryCode } from "@/lib/utils/countryUtils";
import type {
  EmailLogin,
  Register,
  JWT,
  Profile,
  User,
  TokenRefresh,
  PasswordChange,
  PasswordReset,
  PasswordResetConfirm,
  ContentItem,
  PaginatedContentItemList,
  ContentItemQueryParams,
  UserList,
  UserListDetail,
  PaginatedUserListList,
  ListQueryParams,
  ListItem,
  PaginatedListItemList,
  ListItemCreate,
  ListInvitation,
  PaginatedListInvitationList,
  ListInvitationCreate,
  ListInvitationResponse,
  InvitationQueryParams,
  Rating,
  PaginatedRatingList,
  RatingCreate,
  RatingQueryParams,
  VideoSearchResponse,
  MovieDetail,
  TVShowDetail,
  TVSeasonDetail,
  BulkMoviesResponse,
  BulkTVShowsResponse,
  VideoSearchParams,
  MusicSearchResponse,
  AlbumDetail,
  BulkAlbumsResponse,
  MusicSearchParams,
  GameSearchResponse,
  GameDetail,
  BulkGamesResponse,
  GameSearchParams,
  BookSearchResponse,
  BookDetail,
  BulkBooksResponse,
  BookSearchParams,
  HomepageResponse,
  ErrorResponse,
  RestAuthDetail,
  SourceApi,
  ContentType,
} from "./types";

export const authActions = {
  login: (credentials: EmailLogin): Promise<JWT> => {
    return api.post<JWT>("/auth/login/", credentials, false);
  },

  register: (data: Register): Promise<{ user: Profile; access: string; refresh: string }> => {
    return api.post<{ user: Profile; access: string; refresh: string }>("/auth/register/", data, false);
  },

  logout: (): Promise<RestAuthDetail> => {
    return api.post<RestAuthDetail>("/auth/logout/", {}, true);
  },

  getProfile: (): Promise<Profile> => {
    return api.get<Profile>("/auth/user/", true);
  },

  updateProfile: (data: Partial<Profile>): Promise<Profile> => {
    return api.put<Profile>("/auth/user/", data, true);
  },

  patchProfile: (data: Partial<Profile>): Promise<Profile> => {
    return api.patch<Profile>("/auth/user/", data, true);
  },

  changePassword: (data: PasswordChange): Promise<RestAuthDetail> => {
    return api.post<RestAuthDetail>("/auth/password/change/", data, true);
  },

  resetPassword: (data: PasswordReset): Promise<RestAuthDetail> => {
    return api.post<RestAuthDetail>("/auth/password/reset/", data, false);
  },

  confirmPasswordReset: (data: PasswordResetConfirm): Promise<RestAuthDetail> => {
    return api.post<RestAuthDetail>("/auth/password/reset/confirm/", data, false);
  },

  refreshToken: (refresh: string): Promise<TokenRefresh> => {
    return api.post<TokenRefresh>("/auth/token/refresh/", { refresh }, false);
  },

  verifyToken: (token: string): Promise<{ detail?: string }> => {
    return api.post<{ detail?: string }>("/auth/token/verify/", { token }, false);
  },
};

export const contentItemActions = {
  list: (params?: ContentItemQueryParams): Promise<PaginatedContentItemList> => {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, String(value));
        }
      });
    }
    // Always add country parameter if not already provided
    if (!params?.country) {
      queryParams.append("country", getUserCountryCode());
    }
    const query = queryParams.toString();
    return api.get<PaginatedContentItemList>(
      `/content/items/${query ? `?${query}` : ""}`,
      true
    );
  },

  get: (id: number, country?: string): Promise<ContentItem> => {
    const params = new URLSearchParams();
    const countryCode = country || getUserCountryCode();
    params.append("country", countryCode);
    const query = params.toString();
    return api.get<ContentItem>(`/content/items/${id}/${query ? `?${query}` : ""}`, true);
  },

  create: (item: Partial<ContentItem>): Promise<ContentItem> => {
    return api.post<ContentItem>("/content/items/", item, true);
  },

  update: (id: number, item: Partial<ContentItem>): Promise<ContentItem> => {
    return api.put<ContentItem>(`/content/items/${id}/`, item, true);
  },

  patch: (id: number, item: Partial<ContentItem>): Promise<ContentItem> => {
    return api.patch<ContentItem>(`/content/items/${id}/`, item, true);
  },

  delete: (id: number): Promise<void> => {
    return api.delete(`/content/items/${id}/`, true) as Promise<void>;
  },

  findByExternalId: (
    externalId: string,
    sourceApi?: SourceApi,
    contentType?: ContentType,
    page?: number,
    pageSize?: number
  ): Promise<PaginatedContentItemList> => {
    const params = new URLSearchParams();
    params.append("external_id", externalId);
    if (sourceApi) params.append("source_api", sourceApi);
    if (contentType) params.append("content_type", contentType);
    if (page) params.append("page", String(page));
    if (pageSize) params.append("page_size", String(pageSize));

    return api.get<PaginatedContentItemList>(
      `/content/items/by_external_id/?${params}`,
      true
    );
  },

  getOrCreate: (
    sourceApi: SourceApi,
    externalId: string,
    contentType: ContentType,
    country?: string
  ): Promise<ContentItem> => {
    const params = new URLSearchParams();
    params.append("source_api", sourceApi);
    params.append("external_id", externalId);
    params.append("content_type", contentType);
    const countryCode = country || getUserCountryCode();
    params.append("country", countryCode);

    return api.post<ContentItem>(
      `/content/items/get_or_create/?${params}`,
      {},
      true
    );
  },
};

export const listActions = {
  list: (params?: ListQueryParams): Promise<PaginatedUserListList> => {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, String(value));
        }
      });
    }
    // Always add country parameter if not already provided
    if (!params?.country) {
      queryParams.append("country", getUserCountryCode());
    }
    const query = queryParams.toString();
    return api.get<PaginatedUserListList>(
      `/content/lists/${query ? `?${query}` : ""}`,
      true
    );
  },

  get: (id: number, country?: string): Promise<UserListDetail> => {
    const params = new URLSearchParams();
    const countryCode = country || getUserCountryCode();
    params.append("country", countryCode);
    const query = params.toString();
    return api.get<UserListDetail>(`/content/lists/${id}/${query ? `?${query}` : ""}`, true);
  },

  create: (list: {
    name: string;
    description?: string | null;
    list_type: string;
  }): Promise<UserList> => {
    return api.post<UserList>("/content/lists/", list, true);
  },

  update: (id: number, list: Partial<UserList>): Promise<UserList> => {
    return api.put<UserList>(`/content/lists/${id}/`, list, true);
  },

  patch: (id: number, list: Partial<UserList>): Promise<UserList> => {
    return api.patch<UserList>(`/content/lists/${id}/`, list, true);
  },

  delete: (id: number): Promise<void> => {
    return api.delete(`/content/lists/${id}/`, true) as Promise<void>;
  },

  getStats: (id: number): Promise<unknown> => {
    return api.get(`/content/lists/${id}/stats/`, true);
  },
};

export const listItemActions = {
  list: (listId: number, page?: number, pageSize?: number, country?: string): Promise<PaginatedListItemList> => {
    const params = new URLSearchParams();
    if (page) params.append("page", String(page));
    if (pageSize) params.append("page_size", String(pageSize));
    const countryCode = country || getUserCountryCode();
    params.append("country", countryCode);

    const query = params.toString();
    return api.get<PaginatedListItemList>(
      `/content/lists/${listId}/items/${query ? `?${query}` : ""}`,
      true
    );
  },

  get: (listId: number, itemId: number, country?: string): Promise<ListItem> => {
    const params = new URLSearchParams();
    const countryCode = country || getUserCountryCode();
    params.append("country", countryCode);
    const query = params.toString();
    return api.get<ListItem>(
      `/content/lists/${listId}/items/${itemId}/${query ? `?${query}` : ""}`,
      true
    );
  },

  create: (listId: number, item: ListItemCreate): Promise<ListItem> => {
    return api.post<ListItem>(`/content/lists/${listId}/items/`, item, true);
  },

  update: (listId: number, itemId: number, item: Partial<ListItem>): Promise<ListItem> => {
    return api.put<ListItem>(
      `/content/lists/${listId}/items/${itemId}/`,
      item,
      true
    );
  },

  patch: (listId: number, itemId: number, item: Partial<ListItem>): Promise<ListItem> => {
    return api.patch<ListItem>(
      `/content/lists/${listId}/items/${itemId}/`,
      item,
      true
    );
  },

  delete: (listId: number, itemId: number): Promise<void> => {
    return api.delete(`/content/lists/${listId}/items/${itemId}/`, true) as Promise<void>;
  },

  move: (listId: number, itemId: number, position: number, page?: number, pageSize?: number): Promise<PaginatedListItemList> => {
    const params = new URLSearchParams();
    params.append("position", String(position));
    if (page) params.append("page", String(page));
    if (pageSize) params.append("page_size", String(pageSize));

    return api.post<PaginatedListItemList>(
      `/content/lists/${listId}/items/${itemId}/move/?${params}`,
      {},
      true
    );
  },

  reorder: (listId: number, itemIds: number[], page?: number, pageSize?: number): Promise<PaginatedListItemList> => {
    const params = new URLSearchParams();
    if (page) params.append("page", String(page));
    if (pageSize) params.append("page_size", String(pageSize));

    return api.post<PaginatedListItemList>(
      `/content/lists/${listId}/items/reorder/?${params}`,
      { item_ids: itemIds },
      true
    );
  },
};

export const invitationActions = {
  list: (params?: InvitationQueryParams): Promise<PaginatedListInvitationList> => {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, String(value));
        }
      });
    }
    const query = queryParams.toString();
    return api.get<PaginatedListInvitationList>(
      `/content/invitations/${query ? `?${query}` : ""}`,
      true
    );
  },

  get: (id: number): Promise<ListInvitation> => {
    return api.get<ListInvitation>(`/content/invitations/${id}/`, true);
  },

  send: (listId: number, data: ListInvitationCreate): Promise<ListInvitation> => {
    return api.post<ListInvitation>(
      `/content/lists/${listId}/invitations/`,
      data,
      true
    );
  },

  respond: (id: number, action: "accept" | "reject"): Promise<unknown> => {
    return api.post(`/content/invitations/${id}/respond/`, { action }, true);
  },

  delete: (id: number): Promise<void> => {
    return api.delete(`/content/invitations/${id}/`, true) as Promise<void>;
  },

  listForList: (listId: number, params?: InvitationQueryParams): Promise<PaginatedListInvitationList> => {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, String(value));
        }
      });
    }
    const query = queryParams.toString();
    return api.get<PaginatedListInvitationList>(
      `/content/lists/${listId}/invitations/${query ? `?${query}` : ""}`,
      true
    );
  },
};

export const memberActions = {
  list: (listId: number): Promise<User[]> => {
    return api.get<User[]>(`/content/lists/${listId}/members/`, true);
  },

  delete: (listId: number, memberId: number): Promise<void> => {
    return api.delete(`/content/lists/${listId}/members/${memberId}/`, true) as Promise<void>;
  },
};

export const ratingActions = {
  list: (params?: RatingQueryParams): Promise<PaginatedRatingList> => {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, String(value));
        }
      });
    }
    const query = queryParams.toString();
    return api.get<PaginatedRatingList>(
      `/content/ratings/${query ? `?${query}` : ""}`,
      true
    );
  },

  get: (id: number): Promise<Rating> => {
    return api.get<Rating>(`/content/ratings/${id}/`, true);
  },

  create: (rating: RatingCreate): Promise<Rating> => {
    return api.post<Rating>("/content/ratings/", rating, true);
  },

  update: (id: number, rating: RatingCreate): Promise<Rating> => {
    return api.put<Rating>(`/content/ratings/${id}/`, rating, true);
  },

  patch: (id: number, rating: Partial<RatingCreate>): Promise<Rating> => {
    return api.patch<Rating>(`/content/ratings/${id}/`, rating, true);
  },

  delete: (id: number): Promise<void> => {
    return api.delete(`/content/ratings/${id}/`, true) as Promise<void>;
  },
};

export const videoActions = {
  searchMovies: (params: VideoSearchParams): Promise<VideoSearchResponse> => {
    const queryParams = new URLSearchParams();
    queryParams.append("query", params.query);
    if (params.page) queryParams.append("page", String(params.page));
    if (params.page_size) queryParams.append("page_size", String(params.page_size));

    return api.get<VideoSearchResponse>(
      `/proxy/movies/search?${queryParams}`,
      true
    );
  },

  searchTVShows: (params: VideoSearchParams): Promise<VideoSearchResponse> => {
    const queryParams = new URLSearchParams();
    queryParams.append("query", params.query);
    if (params.page) queryParams.append("page", String(params.page));
    if (params.page_size) queryParams.append("page_size", String(params.page_size));

    return api.get<VideoSearchResponse>(
      `/proxy/tv-shows/search?${queryParams}`,
      true
    );
  },

  getMovie: (movieId: number, country?: string): Promise<MovieDetail> => {
    const countryCode = country || getUserCountryCode();
    const params = `?country=${countryCode}`;
    return api.get<MovieDetail>(`/proxy/movies/${movieId}${params}`, true);
  },

  getTVShow: (tvId: number, country?: string): Promise<TVShowDetail> => {
    const countryCode = country || getUserCountryCode();
    const params = `?country=${countryCode}`;
    return api.get<TVShowDetail>(`/proxy/tv-shows/${tvId}${params}`, true);
  },

  getTVSeason: (tvId: number, seasonNumber: number, country?: string): Promise<TVSeasonDetail> => {
    const countryCode = country || getUserCountryCode();
    const params = `?country=${countryCode}`;
    return api.get<TVSeasonDetail>(
      `/proxy/tv-shows/${tvId}/season/${seasonNumber}${params}`,
      true
    );
  },

  bulkGetMovies: (ids: number[], country?: string): Promise<BulkMoviesResponse> => {
    const params = new URLSearchParams();
    params.append("ids", ids.join(","));
    const countryCode = country || getUserCountryCode();
    params.append("country", countryCode);
    return api.get<BulkMoviesResponse>(`/proxy/movies/bulk?${params}`, true);
  },

  bulkGetTVShows: (ids: number[], country?: string): Promise<BulkTVShowsResponse> => {
    const params = new URLSearchParams();
    params.append("ids", ids.join(","));
    const countryCode = country || getUserCountryCode();
    params.append("country", countryCode);
    return api.get<BulkTVShowsResponse>(`/proxy/tv-shows/bulk?${params}`, true);
  },
};

export const musicActions = {
  search: (params: MusicSearchParams): Promise<MusicSearchResponse> => {
    const queryParams = new URLSearchParams();
    queryParams.append("query", params.query);
    if (params.page) queryParams.append("page", String(params.page));
    if (params.page_size) queryParams.append("page_size", String(params.page_size));

    return api.get<MusicSearchResponse>(
      `/proxy/albums/search?${queryParams}`,
      true
    );
  },

  getAlbum: (albumId: string): Promise<AlbumDetail> => {
    return api.get<AlbumDetail>(`/proxy/albums/${albumId}`, true);
  },

  bulkGetAlbums: (ids: string[]): Promise<BulkAlbumsResponse> => {
    const params = new URLSearchParams();
    params.append("ids", ids.join(","));
    return api.get<BulkAlbumsResponse>(`/proxy/albums/bulk?${params}`, true);
  },
};

export const gameActions = {
  search: (params: GameSearchParams): Promise<GameSearchResponse> => {
    const queryParams = new URLSearchParams();
    queryParams.append("query", params.query);
    if (params.page) queryParams.append("page", String(params.page));
    if (params.page_size) queryParams.append("page_size", String(params.page_size));

    return api.get<GameSearchResponse>(
      `/proxy/games/search?${queryParams}`,
      true
    );
  },

  getGame: (gameId: number): Promise<GameDetail> => {
    return api.get<GameDetail>(`/proxy/games/${gameId}`, true);
  },

  bulkGetGames: (ids: number[]): Promise<BulkGamesResponse> => {
    const params = new URLSearchParams();
    params.append("ids", ids.join(","));
    return api.get<BulkGamesResponse>(`/proxy/games/bulk?${params}`, true);
  },
};

export const bookActions = {
  search: (params: BookSearchParams): Promise<BookSearchResponse> => {
    const queryParams = new URLSearchParams();
    queryParams.append("query", params.query);
    if (params.page) queryParams.append("page", String(params.page));
    if (params.page_size) queryParams.append("page_size", String(params.page_size));

    return api.get<BookSearchResponse>(
      `/proxy/books/search?${queryParams}`,
      true
    );
  },

  getBook: (bookId: string): Promise<BookDetail> => {
    return api.get<BookDetail>(`/proxy/books/${bookId}`, true);
  },

  bulkGetBooks: (ids: string[]): Promise<BulkBooksResponse> => {
    const params = new URLSearchParams();
    params.append("ids", ids.join(","));
    return api.get<BulkBooksResponse>(`/proxy/books/bulk?${params}`, true);
  },
};

export const homepageActions = {
  getSuggestions: (limit = 10, country?: string): Promise<HomepageResponse> => {
    const params = new URLSearchParams();
    params.append("limit", String(limit));
    const countryCode = country || getUserCountryCode();
    params.append("country", countryCode);
    return api.get<HomepageResponse>(
      `/proxy/homepage/?${params}`,
      true
    );
  },
};

export const apiActions = {
  auth: authActions,
  contentItem: contentItemActions,
  list: listActions,
  listItem: listItemActions,
  invitation: invitationActions,
  member: memberActions,
  rating: ratingActions,
  video: videoActions,
  music: musicActions,
  game: gameActions,
  book: bookActions,
  homepage: homepageActions,
};

export default apiActions;
