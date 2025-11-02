import { create } from "zustand";
import { api } from "@/lib/api";
import {
  ContentApiResponse,
  Movie,
  TVShow,
  Game,
  MusicAlbum,
  Book,
} from "@/types/contentTypes";

interface ContentSuggestions {
  movies: Movie[];
  tvShows: TVShow[];
  games: Game[];
  music: MusicAlbum[];
  books: Book[];
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
      const response = await api.get<ContentApiResponse>(
        `/proxy/homepage/?limit=${limit}`,
        true // Requires authentication
      );

      set({
        suggestions: {
          movies: response.movies || [],
          tvShows: response.tv_shows || [],
          games: response.games || [],
          music: response.music || [],
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
