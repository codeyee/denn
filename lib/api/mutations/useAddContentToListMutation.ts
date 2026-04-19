import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useToast } from "@/app/_components/common/Toast";
import { listItemActions } from "@/lib/api";
import { queryKeys } from "@/lib/api/queries/keys";
import type { ListItem, ListItemCreate } from "@/lib/types";

interface AddVariables {
  listId: number;
  payload: ListItemCreate;
  fields?: string;
}

interface AddOptions<TContext> {
  onMutate?: (vars: AddVariables) => TContext | Promise<TContext>;
  onError?: (
    error: Error,
    vars: AddVariables,
    context: TContext | undefined,
  ) => void;
  onSuccess?: (item: ListItem, vars: AddVariables) => void;
}

/**
 * Add a content item to a list with the optimistic-update lifecycle:
 * the caller is given a chance to insert a placeholder row in
 * `onMutate` and to revert it in `onError`. The lists+listItems caches
 * are invalidated on settle.
 *
 * This wraps `listItemActions.create` and is the canonical entry point
 * for "add to list" interactions (modal, content card, detail page).
 */
export function useAddContentToListMutation<TContext = unknown>(
  options: AddOptions<TContext> = {},
) {
  const qc = useQueryClient();
  const { showToast } = useToast();

  return useMutation<ListItem, Error, AddVariables, TContext | undefined>({
    mutationFn: ({ listId, payload, fields }) =>
      listItemActions.create(listId, payload, fields ?? "id,status"),
    onMutate: async (vars) => {
      await Promise.all([
        qc.cancelQueries({ queryKey: queryKeys.listItems.all(vars.listId) }),
        qc.cancelQueries({ queryKey: queryKeys.lists.all }),
      ]);
      return options.onMutate
        ? await options.onMutate(vars)
        : (undefined as TContext | undefined);
    },
    onError: (error, vars, context) => {
      options.onError?.(error, vars, context);
      showToast(
        error.message || "No se pudo agregar el item a la lista",
        "error",
      );
    },
    onSuccess: (item, vars) => {
      options.onSuccess?.(item, vars);
    },
    onSettled: (_data, _error, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.listItems.all(vars.listId) });
      qc.invalidateQueries({ queryKey: queryKeys.lists.all });
    },
  });
}
