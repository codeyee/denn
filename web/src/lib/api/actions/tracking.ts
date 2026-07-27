import { api } from "../api";
import type { TrackingStatus, UserContentTracking } from "@/lib/types";

export const trackingActions = {
  setStatus: (
    contentId: number,
    status: TrackingStatus,
    acknowledgeEffects = false,
  ): Promise<UserContentTracking> =>
    api.put<UserContentTracking>(
      `/content/tracking/${contentId}/`,
      { status, acknowledge_effects: acknowledgeEffects },
      true,
    ),

  remove: (contentId: number, acknowledgeEffects = false): Promise<void> =>
    api.delete<void>(
      `/content/tracking/${contentId}/${
        acknowledgeEffects ? "?acknowledge_effects=true" : ""
      }`,
      true,
    ),

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
