import { create } from "zustand";
import { api, apiRequest } from "@/lib/api";
import { ListsApiResponse, List, ListItemsApiResponse, ListType } from "@/types/contentTypes";

interface ListsState {
  lists: List[];
  isLoading: boolean;
  error: string | null;
  lastFetched: number | null;
}

interface ListsActions {
  fetchLists: (options?: {
    render_items?: boolean;
    max_items?: number;
    render_source?: boolean;
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
    render_items?: boolean;
    max_items?: number;
    render_source?: boolean;
  }) => {
    const { lastFetched } = get();
    const fiveMinutesInMs = 5 * 60 * 1000;

    if (lastFetched && Date.now() - lastFetched < fiveMinutesInMs) {
      return;
    }

    set({ isLoading: true, error: null });

    try {
      const queryParams = new URLSearchParams();

      if (options?.render_items !== undefined) {
        queryParams.append("render_items", options.render_items.toString());
      }
      if (options?.max_items !== undefined) {
        queryParams.append("max_items", options.max_items.toString());
      }
      if (options?.render_source !== undefined) {
        queryParams.append("render_source", options.render_source.toString());
      }

      const queryString = queryParams.toString();
      const endpoint = `/content/lists/${queryString ? `?${queryString}` : ""}`;

      const response = await api.get<ListsApiResponse>(
        endpoint,
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

  createList: async (name: string, description?: string, listType: ListType = ListType.PERSONAL) => {
    set({ isLoading: true, error: null });

    try {
      const response = await api.post<List>(
        `/content/lists/`,
        {
          name,
          description: description || null,
          list_type: listType,
        },
        true
      );

      const { lists } = get();
      set({
        lists: [response, ...lists],
        isLoading: false,
        error: null,
      });

      return response;
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

