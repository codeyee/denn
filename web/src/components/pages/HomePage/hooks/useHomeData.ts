import { useMemo } from "react";

import {
    HOME_LIST_FIELDS,
    HOME_LIST_IMAGES_SIZE,
    HOME_LIST_ITEMS_SIZE,
    HOME_LIST_SOURCE_FIELDS,
    SUGGESTIONS_PAGE_SIZE,
    useSuggestionsQuery,
    useUserListsQuery,
} from "@/lib/api/queries";
import { useCreateListMutation } from "@/lib/api/mutations";
import type { HomepageResponse, ListType, PaginatedUserListList } from "@/lib/types";

interface UseHomeDataOptions {
    country?: string | null;
    initialSuggestions?: HomepageResponse;
    initialLists?: PaginatedUserListList;
}

export function useHomeData({
    country,
    initialSuggestions,
    initialLists,
}: UseHomeDataOptions = {}) {
    const suggestionsQuery = useSuggestionsQuery(SUGGESTIONS_PAGE_SIZE, {
        country,
        initialData: initialSuggestions,
    });
    const listsQuery = useUserListsQuery({
        items_size: HOME_LIST_ITEMS_SIZE,
        images_size: HOME_LIST_IMAGES_SIZE,
        fields: HOME_LIST_FIELDS,
        source_fields: HOME_LIST_SOURCE_FIELDS,
        country: country ?? undefined,
    }, {
        initialData: initialLists,
    });
    const createListMutation = useCreateListMutation();

    const suggestions = useMemo(
        () => ({
            movies: suggestionsQuery.data?.movies?.results ?? [],
            tvShows: suggestionsQuery.data?.["tv-shows"]?.results ?? [],
            games: suggestionsQuery.data?.games?.results ?? [],
            music: suggestionsQuery.data?.albums?.results ?? [],
            books: suggestionsQuery.data?.books?.results ?? [],
        }),
        [suggestionsQuery.data],
    );

    const lists = listsQuery.data?.results ?? [];
    const suggestionsError = errorMessage(suggestionsQuery.error);
    const listsError = errorMessage(listsQuery.error);
    const hasAnyError = Boolean(suggestionsError || listsError);

    const isAllEmpty =
        !suggestionsQuery.isLoading &&
        !listsQuery.isLoading &&
        suggestions.movies.length === 0 &&
        suggestions.tvShows.length === 0 &&
        suggestions.games.length === 0 &&
        suggestions.music.length === 0 &&
        suggestions.books.length === 0 &&
        lists.length === 0;

    const createList = async (
        name: string,
        description?: string,
        listType?: ListType,
    ) => {
        await createListMutation.mutateAsync({ name, description, listType });
    };

    return {
        suggestions,
        suggestionsLoading: suggestionsQuery.isLoading,
        suggestionsError,
        lists,
        listsLoading: listsQuery.isLoading,
        listsError,
        createList,
        isCreatingList: createListMutation.isPending,
        hasAnyError,
        isAllEmpty,
    };
}

function errorMessage(error: unknown) {
    return error instanceof Error ? error.message : null;
}
