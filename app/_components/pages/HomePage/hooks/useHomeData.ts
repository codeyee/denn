import { useEffect } from "react";
import { useContentStore } from "@/app/_stores/content-store";
import { useListsStore } from "@/app/_stores/lists-store";

const SUGGESTIONS_PAGE_SIZE = 20;
const LISTS_ITEMS_SIZE = 8;

export function useHomeData() {
  const {
    suggestions,
    isLoading: suggestionsLoading,
    error: suggestionsError,
    fetchSuggestions,
  } = useContentStore();

  const {
    lists,
    isLoading: listsLoading,
    error: listsError,
    fetchLists,
    createList,
  } = useListsStore();

  useEffect(() => {
    fetchSuggestions(SUGGESTIONS_PAGE_SIZE);
    fetchLists({ items_size: LISTS_ITEMS_SIZE });
  }, [fetchSuggestions, fetchLists]);

  const hasAnyError = Boolean(suggestionsError || listsError);

  const isAllEmpty = (
    !suggestionsLoading &&
    suggestions.movies.length === 0 &&
    suggestions.tvShows.length === 0 &&
    suggestions.games.length === 0 &&
    suggestions.music.length === 0 &&
    suggestions.books.length === 0
  );

  return {
    suggestions,
    suggestionsLoading,
    suggestionsError,
    lists,
    listsLoading,
    listsError,
    createList,
    hasAnyError,
    isAllEmpty,
  };
}
