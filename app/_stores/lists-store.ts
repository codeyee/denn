import { create } from "zustand";
import { api, apiRequest } from "@/lib/api";
import { ListsApiResponse, List, ListItemsApiResponse } from "@/types/contentTypes";

interface ListsState {
  lists: List[];
  isLoading: boolean;
  error: string | null;
  lastFetched: number | null;
}

interface ListsActions {
  fetchLists: () => Promise<void>;
  fetchListItems: (listId: number, pageSize: number) => Promise<void>;
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

  fetchLists: async () => {
    const { lastFetched } = get();
    const fiveMinutesInMs = 5 * 60 * 1000;

    if (lastFetched && Date.now() - lastFetched < fiveMinutesInMs) {
      return;
    }

    set({ isLoading: true, error: null });

    try {
      const response = await api.get<ListsApiResponse>(
        `/content/lists/`,
        true
      );

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
      const response = await apiRequest<ListItemsApiResponse>(
        `/content/lists/${listId}/items/?page_size=${pageSize || 10}&render_source=true`,
        {
          method: "GET",
          requiresAuth: true,
        }
      );

      const { lists } = get();
      const updatedLists = lists.map((list) =>
        list.id === listId
          ? { ...list, items: response.results || [] }
          : list
      );

      set({ lists: updatedLists });
    } catch (error) {
      console.error(`Failed to fetch items for list ${listId}:`, error);
    }
  },

  clearError: () => {
    set({ error: null });
  },

  resetLists: () => {
    set(initialState);
  },
}));

