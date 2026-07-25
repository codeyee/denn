import { api } from "../api";
import type { TrackingStatus, UserContentTracking } from "@/lib/types";

export const trackingActions = {
  setStatus: (
    contentId: number,
    status: TrackingStatus,
  ): Promise<UserContentTracking> =>
    api.put<UserContentTracking>(
      `/content/tracking/${contentId}/`,
      { status },
      true,
    ),

  remove: (contentId: number): Promise<void> =>
    api.delete<void>(`/content/tracking/${contentId}/`, true),

  setFavorite: (
    contentId: number,
    isFavorite: boolean,
  ): Promise<UserContentTracking> =>
    api.patch<UserContentTracking>(
      `/content/tracking/${contentId}/favorite/`,
      { is_favorite: isFavorite },
      true,
    ),
};
