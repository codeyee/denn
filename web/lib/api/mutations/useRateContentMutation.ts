import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useToast } from "@/app/_components/common/Toast";
import { ratingActions } from "@/lib/api";
import { queryKeys } from "@/lib/api/queries/keys";
import type { Rating, RatingCreate } from "@/lib/types";

interface RateVariables {
  listId?: number;
  itemId?: number;
  data: RatingCreate;
}

interface RateOptions<TContext> {
  onMutate?: (vars: RateVariables) => TContext | Promise<TContext>;
  onError?: (
    error: Error,
    vars: RateVariables,
    context: TContext | undefined,
  ) => void;
  onSuccess?: (rating: Rating, vars: RateVariables) => void;
}

/**
 * Optimistic rating creation. Lets the caller patch the local list-item
 * cache (member_ratings + count) in `onMutate` and revert in `onError`.
 * On success the React Query list-items cache is invalidated so the
 * next read sees the canonical rating row from the API.
 */
export function useRateContentMutation<TContext = unknown>(
  options: RateOptions<TContext> = {},
) {
  const qc = useQueryClient();
  const { showToast } = useToast();

  return useMutation<Rating, Error, RateVariables, TContext | undefined>({
    mutationFn: ({ data }) => ratingActions.create(data),
    onMutate: async (vars) => {
      if (vars.listId !== undefined) {
        await qc.cancelQueries({
          queryKey: queryKeys.listItems.all(vars.listId),
        });
      }
      return options.onMutate
        ? await options.onMutate(vars)
        : (undefined as TContext | undefined);
    },
    onError: (error, vars, context) => {
      options.onError?.(error, vars, context);
      showToast(error.message || "No se pudo guardar la calificacion", "error");
    },
    onSuccess: (rating, vars) => {
      options.onSuccess?.(rating, vars);
    },
    onSettled: (_data, _error, vars) => {
      if (vars.listId !== undefined) {
        qc.invalidateQueries({
          queryKey: queryKeys.listItems.all(vars.listId),
        });
      }
    },
  });
}
