import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";

import { useToast } from "@/components/common/Toast";
import { listActions, listItemActions } from "@/lib/api";
import { queryKeys } from "@/lib/api/queries/keys";
import { ListType, ListVisibility, type UserList } from "@/lib/types";
import type { SortClause } from "@/lib/types/listView";

interface SaveListVariables {
  name: string;
  description?: string;
  listType?: ListType;
  visibility?: ListVisibility;
}

interface UpdateListVariables extends SaveListVariables {
  listId: number;
}

interface DeleteListItemVariables {
  listId: number;
  itemId: number;
}

interface ApplySortVariables {
  listId: number;
  sort: SortClause[];
}

export function useCreateListMutation() {
  const qc = useQueryClient();
  const { showToast } = useToast();

  return useMutation<UserList, Error, SaveListVariables>({
    mutationFn: ({ name, description, listType }) =>
      listActions.create({
        name,
        description: description || null,
        list_type: listType ?? ListType.PERSONAL,
      }),
    onError: (error) => {
      showToast(error.message || "No se pudo crear la lista", "error");
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.lists.all });
    },
  });
}

export function useUpdateListMutation() {
  const qc = useQueryClient();
  const { showToast } = useToast();

  return useMutation<UserList, Error, UpdateListVariables>({
    mutationFn: ({ listId, name, description, listType, visibility }) =>
      listActions.patch(listId, {
        name,
        description: description || null,
        ...(listType ? { list_type: listType } : {}),
        ...(visibility ? { visibility } : {}),
      }),
    onError: (error) => {
      showToast(error.message || "No se pudo actualizar la lista", "error");
    },
    onSettled: (_data, _error, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.lists.all });
      qc.invalidateQueries({ queryKey: queryKeys.lists.detail(vars.listId) });
    },
  });
}

export function useDeleteListMutation() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { showToast } = useToast();

  return useMutation<void, Error, number>({
    mutationFn: (listId) => listActions.delete(listId),
    onSuccess: () => {
      void navigate({ to: "/" });
    },
    onError: (error) => {
      showToast(error.message || "No se pudo eliminar la lista", "error");
    },
    onSettled: (_data, _error, listId) => {
      qc.invalidateQueries({ queryKey: queryKeys.lists.all });
      qc.invalidateQueries({ queryKey: queryKeys.lists.detail(listId) });
    },
  });
}

export function useDeleteListItemMutation() {
  const qc = useQueryClient();
  const { showToast } = useToast();

  return useMutation<void, Error, DeleteListItemVariables>({
    mutationFn: ({ listId, itemId }) => listItemActions.delete(listId, itemId),
    onError: (error) => {
      showToast(error.message || "No se pudo eliminar el item", "error");
    },
    onSettled: (_data, _error, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.listItems.all(vars.listId) });
      qc.invalidateQueries({ queryKey: queryKeys.lists.stats(vars.listId) });
      qc.invalidateQueries({ queryKey: queryKeys.lists.all });
    },
  });
}

export function useApplySortAsListOrderMutation() {
  const qc = useQueryClient();
  const { showToast } = useToast();

  return useMutation<{ updated: number }, Error, ApplySortVariables>({
    mutationFn: ({ listId, sort }) =>
      listItemActions.applySortAsListOrder(listId, sort),
    onError: (error) => {
      showToast(error.message || "No se pudo aplicar el orden", "error");
    },
    onSettled: (_data, _error, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.listItems.all(vars.listId) });
    },
  });
}
