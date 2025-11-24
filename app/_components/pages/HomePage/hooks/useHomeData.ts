import { useEffect, useState } from "react";
import { useContentStore } from "@/app/_stores/content-store";
import { useListsStore } from "@/app/_stores/lists-store";

const SUGGESTIONS_PAGE_SIZE = 20;
const SUGGESTIONS_IMAGES_SIZE = 4;
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

    // Track when suggestions are loaded to enable cascading fetch
    const [suggestionsLoaded, setSuggestionsLoaded] = useState(false);

    // STEP 1: Fetch critical homepage suggestions FIRST
    useEffect(() => {
        const commonFields = [
            "id",
            "type",
            "title",
            "original_title",
            "image_url",
            "images",
            "description",
            "authors.name",
            "release_date",
        ];

        const movieFields = [...commonFields, "duration_minutes"].map(
            (f) => `movies.${f}`
        );
        const tvShowFields = [
            ...commonFields,
            "number_of_seasons",
            "number_of_episodes",
        ].map((f) => `tv_shows.${f}`);
        const gameFields = [...commonFields].map((f) => `games.${f}`);
        const albumFields = [
            ...commonFields,
            "total_tracks",
            "duration_minutes",
        ].map((f) => `albums.${f}`);
        const bookFields = [...commonFields, "pages"].map((f) => `books.${f}`);

        const allSuggestionFields = [
            ...movieFields,
            ...tvShowFields,
            ...gameFields,
            ...albumFields,
            ...bookFields,
        ].join(",");

        fetchSuggestions(
            SUGGESTIONS_PAGE_SIZE,
            allSuggestionFields,
            SUGGESTIONS_IMAGES_SIZE
        ).then(() => {
            // Mark suggestions as loaded to trigger lists fetch
            setSuggestionsLoaded(true);
        }).catch(() => {
            // Even on error, allow lists to load
            setSuggestionsLoaded(true);
        });
    }, [fetchSuggestions]);

    // STEP 2: Fetch lists ONLY after suggestions complete (Intentional Waterfall)
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
