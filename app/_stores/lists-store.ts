import { create } from "zustand";
import { listActions, listItemActions } from "@/lib/api";
import { UserList, ListType, ItemStatus } from "@/lib/api/types";
import { ListWithItems, ListItem } from "@/types";

interface ListsState {
  lists: ListWithItems[];
  isLoading: boolean;
  error: string | null;
  lastFetched: number | null;
}

interface ListsActions {
  fetchLists: (options?: { items_size?: number }) => Promise<void>;
  forceRefreshLists: (options?: { items_size?: number }) => Promise<void>;
  fetchListItems: (listId: number, pageSize: number) => Promise<void>;
  createList: (
    name: string,
    description?: string,
    listType?: ListType
  ) => Promise<ListWithItems>;
  updateList: (
    listId: number,
    name: string,
    description?: string,
    listType?: ListType
  ) => Promise<void>;
  deleteList: (listId: number) => Promise<void>;
  deleteListItem: (listId: number, itemId: number) => Promise<void>;
  updateListItemStatus: (
    listId: number,
    itemId: number,
    status: ItemStatus
  ) => Promise<void>;
  clearError: () => void;
  resetLists: () => void;
}

export type ListsStore = ListsState & ListsActions;

const initialState: ListsState = {
  lists: [],
  isLoading: false,
  error: null,
  lastFetched: null,
};

export const useListsStore = create<ListsStore>((set, get) => ({
  ...initialState,

  fetchLists: async (options?: { items_size?: number }) => {
    const { lastFetched } = get();
    const fiveMinutesInMs = 5 * 60 * 1000;

    if (lastFetched && Date.now() - lastFetched < fiveMinutesInMs) {
      return;
    }

    set({ isLoading: true, error: null });

    try {
      const response = await listActions.list(options);

      set({
        lists: response.results || [],
        isLoading: false,
        error: null,
        lastFetched: Date.now(),
      });
    } catch (error) {
      set({
        error:
          error instanceof Error
            ? error.message
            : "An error occurred while fetching lists",
        isLoading: false,
      });
      throw error;
    }
  },

  forceRefreshLists: async (options?: { items_size?: number }) => {
    set({ isLoading: true, error: null });

    try {
      const response = await listActions.list(options);

      set({
        lists: response.results || [],
        isLoading: false,
        error: null,
        lastFetched: Date.now(),
      });
    } catch (error) {
      set({
        error:
          error instanceof Error
            ? error.message
            : "An error occurred while fetching lists",
        isLoading: false,
      });
      throw error;
    }
  },

  fetchListItems: async (listId: number, pageSize: number) => {
    try {
      const response = await listItemActions.list(
        listId,
        undefined,
        pageSize || 10
      );

      const { lists } = get();
      const updatedLists = lists.map((list) =>
        list.id === listId
          ? {
              ...list,
              items: (response.results || []) as unknown as ListItem[],
            }
          : list
      );

      set({ lists: updatedLists });
    } catch (error) {
      console.error(`Failed to fetch items for list ${listId}:`, error);
    }
  },

  createList: async (
    name: string,
    description?: string,
    listType: ListType = ListType.PERSONAL
  ): Promise<ListWithItems> => {
    set({ isLoading: true, error: null });

    try {
      const response = await listActions.create({
        name,
        description: description || null,
        list_type: listType,
      });

      const { lists } = get();
      const newList = response as ListWithItems;
      set({
        lists: [newList, ...lists],
        isLoading: false,
        error: null,
      });

      return newList;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to create list";

      set({
        error: errorMessage,
        isLoading: false,
      });

      throw error;
    }
  },

  updateList: async (
    listId: number,
    name: string,
    description?: string,
    listType: ListType = ListType.PERSONAL
  ): Promise<void> => {
    set({ isLoading: true, error: null });

    try {
      const response = await listActions.patch(listId, {
        name,
        description: description || null,
        list_type: listType,
      });

      const { lists } = get();
      // Merge the response with the existing list to preserve items array
      const updatedLists = lists.map((list) =>
        list.id === listId ? { ...list, ...response } : list
      );

      set({
        lists: updatedLists,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to update list";

      set({
        error: errorMessage,
        isLoading: false,
      });

      throw error;
    }
  },

  deleteList: async (listId: number): Promise<void> => {
    set({ isLoading: true, error: null });

    try {
      await listActions.delete(listId);

      const { lists } = get();
      const updatedLists = lists.filter((list) => list.id !== listId);

      set({
        lists: updatedLists,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to delete list";

      set({
        error: errorMessage,
        isLoading: false,
      });

      throw error;
    }
  },

  deleteListItem: async (listId: number, itemId: number): Promise<void> => {
    try {
      await listItemActions.delete(listId, itemId);

      const { lists } = get();
      const updatedLists = lists.map((list) => {
        if (list.id === listId && list.items) {
          return {
            ...list,
            items: list.items.filter((item) => item.id !== itemId),
            item_count: String(parseInt(list.item_count || "0") - 1),
          };
        }
        return list;
      });

      set({ lists: updatedLists });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to delete list item";

      set({ error: errorMessage });
      throw error;
    }
  },

  updateListItemStatus: async (
    listId: number,
    itemId: number,
    status: ItemStatus
  ): Promise<void> => {
    try {
      const updateData = {
        status,
        completed_at:
          status === ItemStatus.COMPLETED ? new Date().toISOString() : null,
      };

      const response = await listItemActions.patch(listId, itemId, updateData);

      const { lists } = get();
      const updatedLists = lists.map((list) => {
        if (list.id === listId && list.items) {
          return {
            ...list,
            items: list.items.map((item) =>
              item.id === itemId ? (response as unknown as ListItem) : item
            ),
          };
        }
        return list;
      });

      set({ lists: updatedLists });
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to update list item status";

      set({ error: errorMessage });
      throw error;
    }
  },

  clearError: () => {
    set({ error: null });
  },

  resetLists: () => {
    set(initialState);
  },
}));
