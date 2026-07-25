import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useToast } from "@/components/common/Toast";
import { profileActions } from "@/lib/api";
import { queryKeys } from "@/lib/api/queries/keys";
import type {
  PublicProfileIdentity,
  PublicProfileOverview,
  PublicProfileUpdate,
} from "@/lib/types";
import { useAuthStore, type User } from "@/stores/auth-store";

interface Variables {
  username: string;
  data: PublicProfileUpdate;
}

interface Context {
  previousOverview?: PublicProfileOverview;
  previousUser: User | null;
}

export function useUpdatePublicProfileMutation() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation<PublicProfileIdentity, Error, Variables, Context>({
    mutationFn: ({ data }) => profileActions.updateMe(data),
    onMutate: async ({ username, data }) => {
      const key = queryKeys.profiles.overview(username);
      await queryClient.cancelQueries({ queryKey: key });
      const previousOverview =
        queryClient.getQueryData<PublicProfileOverview>(key);
      queryClient.setQueryData<PublicProfileOverview>(key, (current) =>
        current
          ? {
              ...current,
              profile: {
                ...current.profile,
                bio: data.bio,
                avatar_url: data.avatar_url,
              },
            }
          : current,
      );
      const previousUser = useAuthStore.getState().user;
      if (previousUser) {
        useAuthStore.getState().setUser({
          ...previousUser,
          bio: data.bio,
          avatar_url: data.avatar_url,
        });
      }
      return { previousOverview, previousUser };
    },
    onError: (error, { username }, context) => {
      if (context?.previousOverview) {
        queryClient.setQueryData(
          queryKeys.profiles.overview(username),
          context.previousOverview,
        );
      }
      useAuthStore.getState().setUser(context?.previousUser ?? null);
      showToast(error.message || "Could not update your profile.", "error");
    },
    onSuccess: (profile, { username }) => {
      queryClient.setQueryData<PublicProfileOverview>(
        queryKeys.profiles.overview(username),
        (current) => current ? { ...current, profile } : current,
      );
      const user = useAuthStore.getState().user;
      if (user) {
        useAuthStore.getState().setUser({
          ...user,
          bio: profile.bio,
          avatar_url: profile.avatar_url,
        });
      }
      showToast("Profile updated.", "success");
    },
    onSettled: (_data, _error, { username }) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.profiles.overview(username),
      });
    },
  });
}
