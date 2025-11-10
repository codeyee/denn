import { create } from "zustand";
import { listActions, listItemActions } from "@/lib/api";
import { List, ListType } from "@/types/contentTypes";

interface ListsState {
  lists: List[];
  isLoading: boolean;
  error: string | null;
  lastFetched: number | null;
}

interface ListsActions {
  fetchLists: (options?: {
    items_size?: number;
  }) => Promise<void>;
  forceRefreshLists: (options?: {
    items_size?: number;
  }) => Promise<void>;
  fetchListItems: (listId: number, pageSize: number) => Promise<void>;
  createList: (name: string, description?: string, listType?: ListType) => Promise<List>;
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

  fetchLists: async (options?: {
    items_size?: number;
  }) => {
    const { lastFetched } = get();
    const fiveMinutesInMs = 5 * 60 * 1000;

    if (lastFetched && Date.now() - lastFetched < fiveMinutesInMs) {
      return;
    }

    set({ isLoading: true, error: null });

    try {
      const response = await listActions.list(options);

      set({
        lists: (response.results || []) as unknown as List[],
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

  forceRefreshLists: async (options?: {
    items_size?: number;
  }) => {
    set({ isLoading: true, error: null });

    try {
      const response = await listActions.list(options);

      set({
        lists: (response.results || []) as unknown as List[],
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
      const response = await listItemActions.list(listId, undefined, pageSize || 10);

      const { lists } = get();
      const updatedLists = lists.map((list) =>
        list.id === listId
          ? { ...list, items: (response.results || []) as unknown as import('@/types/contentTypes').ListItem[] }
          : list
      );

      set({ lists: updatedLists });
    } catch (error) {
      console.error(`Failed to fetch items for list ${listId}:`, error);
    }
  },

  createList: async (name: string, description?: string, listType: ListType = ListType.PERSONAL): Promise<List> => {
    set({ isLoading: true, error: null });

    try {
      const response = await listActions.create({
        name,
        description: description || null,
        list_type: listType,
      });

      const { lists } = get();
      const typedResponse = response as unknown as List;
      set({
        lists: [typedResponse, ...lists],
        isLoading: false,
        error: null,
      });

      return typedResponse;
    } catch (error) {
      const errorMessage = error instanceof Error
        ? error.message
        : "Failed to create list";

      set({
        error: errorMessage,
        isLoading: false,
      });

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

