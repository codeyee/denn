import {
  useMutation,
  useQueryClient,
  type QueryKey,
} from "@tanstack/react-query";

import { useToast } from "@/components/common/Toast";
import { trackingActions } from "@/lib/api";
import { ApiRequestError } from "@/lib/api/api";
import { queryKeys } from "@/lib/api/queries/keys";
import type {
  ContentItem,
  TrackingStatus,
  UserContentTracking,
} from "@/lib/types";

type DetailSnapshot = Array<[QueryKey, ContentItem | undefined]>;

interface TrackingVariables {
  contentId: number;
  status: TrackingStatus;
  acknowledgeEffects?: boolean;
}

interface FavoriteVariables {
  contentId: number;
  isFavorite: boolean;
}

interface DeleteTrackingVariables {
  contentId: number;
  acknowledgeEffects?: boolean;
}

export function useSetTrackingStatusMutation() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation<
    UserContentTracking,
    Error,
    TrackingVariables,
    { snapshot: DetailSnapshot }
  >({
    mutationFn: ({ contentId, status, acknowledgeEffects }) =>
      trackingActions.setStatus(contentId, status, acknowledgeEffects),
    onMutate: async ({ contentId, status }) => {
      const snapshot = await snapshotContentDetails(queryClient);
      updateTrackingInCachedDetails(queryClient, contentId, (current) => ({
        content_id: current?.content_id ?? contentId,
        status,
        last_completed_at:
          status === "completed"
            ? current?.last_completed_at ?? new Date().toISOString()
            : current?.last_completed_at ?? null,
        is_favorite:
          status === "completed" ? current?.is_favorite ?? false : false,
        favorited_at:
          status === "completed" ? current?.favorited_at ?? null : null,
        created_at: current?.created_at ?? new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));
      return { snapshot };
    },
    onError: (error, _variables, context) => {
      restoreSnapshot(queryClient, context?.snapshot);
      if (
        error instanceof ApiRequestError &&
        error.data.error === "TRACKING_EFFECTS_REQUIRE_CONFIRMATION"
      ) {
        return;
      }
      showToast(error.message || "Could not update tracking.", "error");
    },
    onSuccess: (tracking, { contentId }) => {
      updateTrackingInCachedDetails(
        queryClient,
        contentId,
        () => tracking,
      );
    },
    onSettled: () => invalidateTrackingResources(queryClient),
  });
}

export function useSetFavoriteMutation() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation<
    UserContentTracking,
    Error,
    FavoriteVariables,
    { snapshot: DetailSnapshot }
  >({
    mutationFn: ({ contentId, isFavorite }) =>
      trackingActions.setFavorite(contentId, isFavorite),
    onMutate: async ({ contentId, isFavorite }) => {
      const snapshot = await snapshotContentDetails(queryClient);
      updateTrackingInCachedDetails(queryClient, contentId, (current) =>
        current
          ? {
              ...current,
              is_favorite: isFavorite,
              favorited_at: isFavorite ? new Date().toISOString() : null,
              updated_at: new Date().toISOString(),
            }
          : null,
      );
      return { snapshot };
    },
    onError: (error, _variables, context) => {
      restoreSnapshot(queryClient, context?.snapshot);
      showToast(error.message || "Could not update favorite.", "error");
    },
    onSuccess: (tracking, { contentId }) => {
      updateTrackingInCachedDetails(
        queryClient,
        contentId,
        () => tracking,
      );
    },
    onSettled: () => invalidateTrackingResources(queryClient),
  });
}

export function useDeleteTrackingMutation() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation<
    void,
    Error,
    DeleteTrackingVariables,
    { snapshot: DetailSnapshot }
  >({
    mutationFn: ({ contentId, acknowledgeEffects }) =>
      trackingActions.remove(contentId, acknowledgeEffects),
    onMutate: async ({ contentId }) => {
      const snapshot = await snapshotContentDetails(queryClient);
      updateTrackingInCachedDetails(queryClient, contentId, () => null);
      return { snapshot };
    },
    onError: (error, _variables, context) => {
      restoreSnapshot(queryClient, context?.snapshot);
      if (
        error instanceof ApiRequestError &&
        error.data.error === "TRACKING_EFFECTS_REQUIRE_CONFIRMATION"
      ) {
        return;
      }
      showToast(error.message || "Could not remove tracking.", "error");
    },
    onSettled: () => invalidateTrackingResources(queryClient),
  });
}

async function snapshotContentDetails(queryClient: ReturnType<typeof useQueryClient>) {
  await queryClient.cancelQueries({ queryKey: queryKeys.contentDetail.all });
  return queryClient.getQueriesData<ContentItem>({
    queryKey: queryKeys.contentDetail.all,
  });
}

function updateTrackingInCachedDetails(
  queryClient: ReturnType<typeof useQueryClient>,
  contentId: number,
  update: (
    current: UserContentTracking | null,
  ) => UserContentTracking | null,
) {
  queryClient.setQueriesData<ContentItem>(
    { queryKey: queryKeys.contentDetail.all },
    (current) => {
      if (!current || current.id !== contentId) return current;
      return {
        ...current,
        current_user_tracking: update(current.current_user_tracking),
      };
    },
  );
}

function restoreSnapshot(
  queryClient: ReturnType<typeof useQueryClient>,
  snapshot?: DetailSnapshot,
) {
  snapshot?.forEach(([key, value]) => {
    queryClient.setQueryData(key, value);
  });
}

function invalidateTrackingResources(
  queryClient: ReturnType<typeof useQueryClient>,
) {
  void queryClient.invalidateQueries({ queryKey: queryKeys.contentDetail.all });
  void queryClient.invalidateQueries({ queryKey: queryKeys.profiles.all });
  void queryClient.invalidateQueries({ queryKey: queryKeys.ratings.all });
  void queryClient.invalidateQueries({ queryKey: ["list-items"] });
  void queryClient.invalidateQueries({ queryKey: queryKeys.lists.all });
  void queryClient.invalidateQueries({ queryKey: queryKeys.dynamicCollections.all });
}
