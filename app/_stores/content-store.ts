import { create } from "zustand";
import { homepageActions } from "@/lib/api";
import {
  MovieDetail,
  TVShowDetail,
  GameDetail,
  AlbumDetail,
  BookDetail,
} from "@/lib/types";

interface ContentSuggestions {
  movies: MovieDetail[];
  tvShows: TVShowDetail[];
  games: GameDetail[];
  music: AlbumDetail[];
  books: BookDetail[];
}

interface ContentState {
  suggestions: ContentSuggestions;
  isLoading: boolean;
  error: string | null;
  lastFetched: number | null;
}

interface ContentActions {
  fetchSuggestions: (limit?: number) => Promise<void>;
  clearError: () => void;
  resetSuggestions: () => void;
}

export type ContentStore = ContentState & ContentActions;

const initialState: ContentState = {
  suggestions: {
    movies: [],
    tvShows: [],
    games: [],
    music: [],
    books: [],
  },
  isLoading: false,
  error: null,
  lastFetched: null,
};

export const useContentStore = create<ContentStore>((set, get) => ({
  ...initialState,

  fetchSuggestions: async (limit = 20) => {
    // Check if we already have data and it's less than 6 hours old
    const { lastFetched } = get();
    const sixHoursInMs = 6 * 60 * 60 * 1000;

    if (lastFetched && Date.now() - lastFetched < sixHoursInMs) {
      // Data is still fresh, no need to fetch
      return;
    }

    set({ isLoading: true, error: null });

    try {
      const response = await homepageActions.getSuggestions(limit);

      set({
        suggestions: {
          movies: response.movies || [],
          tvShows: response.tv_shows || [],
          games: response.games || [],
          music: response.albums || [],
          books: response.books || [],
        },
        isLoading: false,
        error: null,
        lastFetched: Date.now(),
      });
    } catch (error) {
      set({
        error:
          error instanceof Error
            ? error.message
            : "An error occurred while fetching suggestions",
        isLoading: false,
      });
      throw error;
    }
  },

  clearError: () => {
    set({ error: null });
  },

  resetSuggestions: () => {
    set(initialState);
  },
}));
