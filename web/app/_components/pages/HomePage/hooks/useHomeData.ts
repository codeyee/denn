import { useEffect, useState } from "react";
import { useContentStore } from "@/app/_stores/content-store";
import { useListsStore } from "@/app/_stores/lists-store";

const SUGGESTIONS_PAGE_SIZE = 20;
const LISTS_ITEMS_SIZE = 8;
const LISTS_IMAGES_SIZE = 4;

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

    const [suggestionsLoaded, setSuggestionsLoaded] = useState(false);

    useEffect(() => {
        fetchSuggestions(SUGGESTIONS_PAGE_SIZE)
            .then(() => {
                setSuggestionsLoaded(true);
            })
            .catch(() => {
                setSuggestionsLoaded(true);
            });
    }, [fetchSuggestions]);

    useEffect(() => {
        if (!suggestionsLoaded) return;

        const listFields = [
            "id",
            "name",
            "item_count",
            "member_count",
            "list_type",
            "items.id",
            "items.content_item.source_data",
        ];

        const listSourceFields = ["id", "images"];

        fetchLists({
            items_size: LISTS_ITEMS_SIZE,
            images_size: LISTS_IMAGES_SIZE,
            fields: listFields.join(","),
            source_fields: listSourceFields.join(","),
        });
    }, [suggestionsLoaded, fetchLists]);

    const hasAnyError = Boolean(suggestionsError || listsError);

    const isAllEmpty =
        !suggestionsLoading &&
        suggestions.movies.length === 0 &&
        suggestions.tvShows.length === 0 &&
        suggestions.games.length === 0 &&
        suggestions.music.length === 0 &&
        suggestions.books.length === 0;

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
