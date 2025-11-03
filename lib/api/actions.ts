import { api } from "./api";
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
  VideoSuggestionsResponse,
  MovieDetail,
  TVShowDetail,
  TVSeasonDetail,
  BulkMovieItem,
  BulkTVShowItem,
  BulkSeasonItem,
  VideoSearchParams,
  MusicSearchResponse,
  MusicSuggestionsResponse,
  AlbumDetail,
  BulkAlbumsResponse,
  MusicSearchParams,
  GameSearchResponse,
  GamesSuggestionsResponse,
  GameDetail,
  GameSearchParams,
  BookSearchResponse,
  BooksSuggestionsResponse,
  BookDetail,
  BulkBookItem,
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
    const query = queryParams.toString();
    return api.get<PaginatedContentItemList>(
      `/content/items/${query ? `?${query}` : ""}`,
      true
    );
  },

  get: (id: number, renderSource = false): Promise<ContentItem> => {
    const params = renderSource ? "?render_source=true" : "";
    return api.get<ContentItem>(`/content/items/${id}/${params}`, true);
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
    page?: number,
    pageSize?: number
  ): Promise<PaginatedContentItemList> => {
    const params = new URLSearchParams();
    params.append("external_id", externalId);
    if (sourceApi) params.append("source_api", sourceApi);
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
    contentType: ContentType
  ): Promise<ContentItem> => {
    const params = new URLSearchParams();
    params.append("source_api", sourceApi);
    params.append("external_id", externalId);
    params.append("content_type", contentType);

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
    const query = queryParams.toString();
    return api.get<PaginatedUserListList>(
      `/content/lists/${query ? `?${query}` : ""}`,
      true
    );
  },

  get: (id: number, renderSource = false): Promise<UserListDetail> => {
    const params = renderSource ? "?render_source=true" : "";
    return api.get<UserListDetail>(`/content/lists/${id}/${params}`, true);
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
  list: (listId: number, renderSource = false, page?: number, pageSize?: number): Promise<PaginatedListItemList> => {
    const params = new URLSearchParams();
    if (renderSource) params.append("render_source", "true");
    if (page) params.append("page", String(page));
    if (pageSize) params.append("page_size", String(pageSize));

    const query = params.toString();
    return api.get<PaginatedListItemList>(
      `/content/lists/${listId}/items/${query ? `?${query}` : ""}`,
      true
    );
  },

  get: (listId: number, itemId: number, renderSource = false): Promise<ListItem> => {
    const params = renderSource ? "?render_source=true" : "";
    return api.get<ListItem>(
      `/content/lists/${listId}/items/${itemId}/${params}`,
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
  search: (params: VideoSearchParams): Promise<VideoSearchResponse> => {
    const queryParams = new URLSearchParams();
    queryParams.append("query", params.query);
    if (params.page) queryParams.append("page", String(params.page));
    if (params.limit) queryParams.append("limit", String(params.limit));

    return api.get<VideoSearchResponse>(
      `/proxy/video/search?${queryParams}`,
      true
    );
  },

  getSuggestions: (limit = 20): Promise<VideoSuggestionsResponse> => {
    return api.get<VideoSuggestionsResponse>(
      `/proxy/video/suggestions/?limit=${limit}`,
      true
    );
  },

  getMovie: (movieId: number): Promise<MovieDetail> => {
    return api.get<MovieDetail>(`/proxy/video/movie/${movieId}`, true);
  },

  getTVShow: (tvId: number): Promise<TVShowDetail> => {
    return api.get<TVShowDetail>(`/proxy/video/tv/${tvId}`, true);
  },

  getTVSeason: (tvId: number, seasonNumber: number): Promise<TVSeasonDetail> => {
    return api.get<TVSeasonDetail>(
      `/proxy/video/tv/${tvId}/season/${seasonNumber}`,
      true
    );
  },

  bulkGetMovies: (ids: number[]): Promise<BulkMovieItem[]> => {
    const params = new URLSearchParams();
    params.append("ids", ids.join(","));
    return api.get<BulkMovieItem[]>(`/proxy/video/movies/bulk/?${params}`, true);
  },

  bulkGetTVShows: (ids: number[]): Promise<BulkTVShowItem[]> => {
    const params = new URLSearchParams();
    params.append("ids", ids.join(","));
    return api.get<BulkTVShowItem[]>(`/proxy/video/tv/bulk/?${params}`, true);
  },

  bulkGetSeasons: (seasons: Array<{ tvId: number; seasonNumber: number }>): Promise<BulkSeasonItem[]> => {
    const params = new URLSearchParams();
    const seasonStrings = seasons.map(s => `${s.tvId}:${s.seasonNumber}`);
    params.append("seasons", seasonStrings.join(","));
    return api.get<BulkSeasonItem[]>(`/proxy/video/seasons/bulk/?${params}`, true);
  },
};

export const musicActions = {
  search: (params: MusicSearchParams): Promise<MusicSearchResponse> => {
    const queryParams = new URLSearchParams();
    queryParams.append("query", params.query);
    if (params.offset) queryParams.append("offset", String(params.offset));
    if (params.limit) queryParams.append("limit", String(params.limit));
    if (params.min_tracks) queryParams.append("min_tracks", String(params.min_tracks));

    return api.get<MusicSearchResponse>(
      `/proxy/music/search?${queryParams}`,
      true
    );
  },

  getSuggestions: (limit = 20): Promise<MusicSuggestionsResponse> => {
    return api.get<MusicSuggestionsResponse>(
      `/proxy/music/suggestions/?limit=${limit}`,
      true
    );
  },

  getAlbum: (albumId: string): Promise<AlbumDetail> => {
    return api.get<AlbumDetail>(`/proxy/music/${albumId}`, true);
  },

  bulkGetAlbums: (ids: string[]): Promise<BulkAlbumsResponse> => {
    const params = new URLSearchParams();
    params.append("ids", ids.join(","));
    return api.get<BulkAlbumsResponse>(`/proxy/music/bulk/?${params}`, true);
  },
};

export const gameActions = {
  search: (params: GameSearchParams): Promise<GameSearchResponse> => {
    const queryParams = new URLSearchParams();
    queryParams.append("query", params.query);
    if (params.page) queryParams.append("page", String(params.page));
    if (params.limit) queryParams.append("limit", String(params.limit));

    return api.get<GameSearchResponse>(
      `/proxy/game/search?${queryParams}`,
      true
    );
  },

  getSuggestions: (limit = 20): Promise<GamesSuggestionsResponse> => {
    return api.get<GamesSuggestionsResponse>(
      `/proxy/game/suggestions/?limit=${limit}`,
      true
    );
  },

  bulkGetGames: (ids: number[]): Promise<GameDetail[]> => {
    const params = new URLSearchParams();
    params.append("ids", ids.join(","));
    return api.get<GameDetail[]>(`/proxy/game/bulk/?${params}`, true);
  },
};

export const bookActions = {
  search: (params: BookSearchParams): Promise<BookSearchResponse> => {
    const queryParams = new URLSearchParams();
    queryParams.append("query", params.query);
    if (params.page) queryParams.append("page", String(params.page));
    if (params.limit) queryParams.append("limit", String(params.limit));

    return api.get<BookSearchResponse>(
      `/proxy/book/search?${queryParams}`,
      true
    );
  },

  getSuggestions: (limit = 20): Promise<BooksSuggestionsResponse> => {
    return api.get<BooksSuggestionsResponse>(
      `/proxy/book/suggestions/?limit=${limit}`,
      true
    );
  },

  bulkGetBooks: (keys: string[]): Promise<BulkBookItem[]> => {
    const params = new URLSearchParams();
    params.append("keys", keys.join(","));
    return api.get<BulkBookItem[]>(`/proxy/book/bulk/?${params}`, true);
  },
};

export const homepageActions = {
  getSuggestions: (limit = 10): Promise<HomepageResponse> => {
    return api.get<HomepageResponse>(
      `/proxy/homepage/?limit=${limit}`,
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
