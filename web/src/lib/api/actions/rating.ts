import { api } from "../api";
import { buildQueryString } from "../utils/queryParams";
import type {
  Rating,
  PaginatedRatingList,
  RatingCreate,
  RatingQueryParams,
} from "@/lib/types";

export const ratingActions = {
  list: (params?: RatingQueryParams): Promise<PaginatedRatingList> => {
    const query = buildQueryString({ params });
    return api.get<PaginatedRatingList>(`/content/ratings/${query}`, true);
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
