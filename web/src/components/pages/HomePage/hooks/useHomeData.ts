import { useMemo } from "react";

import {
    HOME_LIST_FIELDS,
    HOME_LIST_IMAGES_SIZE,
    HOME_LIST_ITEMS_SIZE,
    HOME_LIST_SOURCE_FIELDS,
    HOME_PROGRESS_SEARCH,
    SUGGESTIONS_PAGE_SIZE,
    useSuggestionsQuery,
    useUserListsQuery,
} from "@/lib/api/queries";
import { useCreateListMutation } from "@/lib/api/mutations";
import { usePublicProgressQuery } from "@/lib/api/queries/usePublicProfileQueries";
import type {
    HomepageResponse,
    ListType,
    PaginatedProfileResults,
    PaginatedUserListList,
    PublicProgressItem,
} from "@/lib/types";

interface UseHomeDataOptions {
    country?: string | null;
    isAuthenticated?: boolean;
    progressUsername?: string | null;
    initialSuggestions?: HomepageResponse;
    initialLists?: PaginatedUserListList;
    initialProgress?: PaginatedProfileResults<PublicProgressItem>;
}

export function useHomeData({
    country,
    isAuthenticated = false,
    progressUsername,
    initialSuggestions,
    initialLists,
    initialProgress,
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
        enabled: isAuthenticated,
        initialData: initialLists,
    });
    const progressQuery = usePublicProgressQuery(
        progressUsername ?? "",
        HOME_PROGRESS_SEARCH,
        initialProgress,
        { enabled: Boolean(isAuthenticated && progressUsername) },
    );
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
    const progress = progressQuery.data?.results ?? [];
    const suggestionsError = errorMessage(suggestionsQuery.error);
    const listsError = errorMessage(listsQuery.error);
    const progressError = errorMessage(progressQuery.error);
    const hasAnyError = Boolean(suggestionsError || listsError || progressError);

    const isAllEmpty =
        !suggestionsQuery.isLoading &&
        !listsQuery.isLoading &&
        !progressQuery.isLoading &&
        suggestions.movies.length === 0 &&
        suggestions.tvShows.length === 0 &&
        suggestions.games.length === 0 &&
        suggestions.music.length === 0 &&
        suggestions.books.length === 0 &&
        lists.length === 0 &&
        progress.length === 0;

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
        listsLoading: isAuthenticated && listsQuery.isLoading,
        listsError,
        progress,
        progressLoading: isAuthenticated && progressQuery.isLoading,
        progressError,
        createList,
        isCreatingList: createListMutation.isPending,
        hasAnyError,
        isAllEmpty,
    };
}

function errorMessage(error: unknown) {
    return error instanceof Error ? error.message : null;
}
