import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useToast } from "@/app/_components/common/Toast";
import { useListsStore } from "@/app/_stores/lists-store";
import { queryKeys } from "@/lib/api/queries/keys";
import { ItemStatus } from "@/lib/types";

interface ToggleVariables {
  listId: number;
  itemId: number;
  nextStatus: ItemStatus;
}

interface ToggleOptions<TContext> {
  onMutate?: (vars: ToggleVariables) => TContext | Promise<TContext>;
  onError?: (
    error: Error,
    vars: ToggleVariables,
    context: TContext | undefined,
  ) => void;
  onSuccess?: (vars: ToggleVariables) => void;
}

/**
 * Optimistic toggle of a list item's status. The actual local-state
 * patch is owned by the call site (it knows the shape of its store);
 * this hook provides the canonical lifecycle: cancel in-flight queries,
 * call the caller's `onMutate` for the optimistic patch, on error
 * surface a toast and let the caller restore the snapshot, and on
 * settle invalidate the React Query cache so any reader migrated to
 * `useListItemsQuery` picks up the truth.
 */
export function useToggleListItemStatusMutation<TContext = unknown>(
  options: ToggleOptions<TContext> = {},
) {
  const qc = useQueryClient();
  const { showToast } = useToast();
  const { updateListItemStatus } = useListsStore();

  return useMutation<unknown, Error, ToggleVariables, TContext | undefined>({
    mutationFn: ({ listId, itemId, nextStatus }) =>
      updateListItemStatus(listId, itemId, nextStatus),
    onMutate: async (vars) => {
      await qc.cancelQueries({ queryKey: queryKeys.listItems.all(vars.listId) });
      return options.onMutate ? await options.onMutate(vars) : (undefined as TContext | undefined);
    },
    onError: (error, vars, context) => {
      options.onError?.(error, vars, context);
      showToast(
        error.message || "No se pudo actualizar el estado del item",
        "error",
      );
    },
    onSuccess: (_data, vars) => {
      options.onSuccess?.(vars);
    },
    onSettled: (_data, _error, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.listItems.all(vars.listId) });
    },
  });
}
