import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useToast } from "@/components/common/Toast";
import { listItemActions } from "@/lib/api";
import { queryKeys } from "@/lib/api/queries/keys";
import type { PaginatedListItemList } from "@/lib/types";

interface ReorderVariables {
  listId: number;
  itemIds: number[];
  page?: number;
  pageSize?: number;
}

interface ReorderOptions<TContext> {
  onMutate?: (vars: ReorderVariables) => TContext | Promise<TContext>;
  onError?: (
    error: Error,
    vars: ReorderVariables,
    context: TContext | undefined,
  ) => void;
  onSuccess?: (vars: ReorderVariables) => void;
}

/**
 * Persist a new list-item order. The caller already presents an
 * optimistic "preview" UI during drag (`useListReordering`); this hook
 * snapshots that order in `onMutate`, surfaces a toast in `onError`
 * and lets the caller restore the previous order via the snapshot.
 */
export function useReorderListItemsMutation<TContext = unknown>(
  options: ReorderOptions<TContext> = {},
) {
  const qc = useQueryClient();
  const { showToast } = useToast();

  return useMutation<PaginatedListItemList, Error, ReorderVariables, TContext | undefined>({
    mutationFn: ({ listId, itemIds, page, pageSize }) =>
      listItemActions.reorder(listId, itemIds, page, pageSize),
    onMutate: async (vars) => {
      await qc.cancelQueries({ queryKey: queryKeys.listItems.all(vars.listId) });
      return options.onMutate
        ? await options.onMutate(vars)
        : (undefined as TContext | undefined);
    },
    onError: (error, vars, context) => {
      options.onError?.(error, vars, context);
      showToast(
        error.message || "No se pudo guardar el nuevo orden",
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
