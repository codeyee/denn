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
    const { lastFetched } = get();
    const sixHoursInMs = 6 * 60 * 60 * 1000;

    if (lastFetched && Date.now() - lastFetched < sixHoursInMs) {
      return;
    }

    set({ isLoading: true, error: null });

    try {
      const response = await homepageActions.getSuggestions({ limit });

      set({
        suggestions: {
          movies: response.movies?.results || [],
          tvShows: response["tv-shows"]?.results || [],
          games: response.games?.results || [],
          music: response.albums?.results || [],
          books: response.books?.results || [],
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
