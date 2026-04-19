import { useState, useCallback } from "react";
import { useListsStore } from "@/app/_stores/lists-store";
import { listItemActions } from "@/lib/api";
import { useAddContentToListMutation } from "@/lib/api/mutations";
import { ListItemCreate, ContentType, SourceApi, TVSeason } from "@/lib/types";
import { useToast } from "@/app/_components/common/Toast";
import { generateRandomListName } from "@/lib/utils/randomListNames";

interface UseListOperationsParams {
    contentItem: {
        source_api: string;
        external_id: string;
        content_type: string;
    };
    tvShowSeasons?: TVSeason[];
    tvShowId?: string;
    refreshLists: () => Promise<void>;
}

interface UseListOperationsReturn {
    loadingListIds: Set<number>;
    creatingNewList: boolean;
    error: string | null;
    setError: (error: string | null) => void;
    handleCreateNewList: () => Promise<void>;
    handleToggleList: (
        listId: number,
        checked: boolean,
        addMode: "show" | "seasons",
        selectedSeasons: Set<number>,
        existingItemId?: number,
        existingSeasonsInList?: Set<number>
    ) => Promise<void>;
}

export function useListOperations({
    contentItem,
    tvShowSeasons,
    tvShowId,
    refreshLists,
}: UseListOperationsParams): UseListOperationsReturn {
    const { createList } = useListsStore();
    const [loadingListIds, setLoadingListIds] = useState<Set<number>>(
        new Set()
    );
    const [creatingNewList, setCreatingNewList] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { showToast } = useToast();

    // T7: shared add-to-list mutation. We let the mutation surface the
    // error toast and keep `setError` for the modal-local state.
    const addToListMutation = useAddContentToListMutation({
        onError: (err) => {
            setError(err.message || "Failed to update list");
        },
    });

    const handleCreateNewList = useCallback(async () => {
        setCreatingNewList(true);
        setError(null);

        try {
            const listName = generateRandomListName();
            const newList = await createList(listName);

            await addToListMutation.mutateAsync({
                listId: newList.id,
                payload: {
                    source_api: contentItem.source_api as SourceApi,
                    external_id: contentItem.external_id,
                    content_type: contentItem.content_type as ContentType,
                    status: "PENDING",
                } as ListItemCreate,
            });

            await refreshLists();
            showToast("List created and item added", "success");

            // We don't close the modal anymore, just refresh
        } catch (err) {
            console.error("Error creating new list:", err);
            const msg =
                err instanceof Error ? err.message : "Failed to create list";
            setError(msg);
            showToast(msg, "error");
        } finally {
            setCreatingNewList(false);
        }
    }, [contentItem, createList, refreshLists, showToast, addToListMutation]);

    const addSeasonsToList = useCallback(
        async (
            listId: number,
            seasonNumbers: number[],
            existingSeasonsInList?: Set<number>
        ) => {
            const addedSeasons: number[] = [];
            const failedSeasons: Array<{
                seasonNumber: number;
                error: string;
            }> = [];

            // Filter out seasons that are already in the list
            const seasonsToAdd = existingSeasonsInList
                ? seasonNumbers.filter((s) => !existingSeasonsInList.has(s))
                : seasonNumbers;

            if (seasonsToAdd.length === 0) {
                showToast(
                    "All selected seasons are already in the list",
                    "info"
                );
                return;
            }

            for (let i = 0; i < seasonsToAdd.length; i++) {
                const seasonNumber = seasonsToAdd[i];
                const season = tvShowSeasons?.find(
                    (s) => s.season_number === seasonNumber
                );

                if (!season) continue;

                try {
                    await listItemActions.create(
                        listId,
                        {
                            source_api: contentItem.source_api as SourceApi,
                            external_id: `${tvShowId}:${seasonNumber}`,
                            content_type: ContentType.SEASON,
                            status: "PENDING",
                        } as ListItemCreate,
                        "id,status"
                    );

                    addedSeasons.push(seasonNumber);
                } catch (err) {
                    console.error(`Error adding season ${seasonNumber}:`, err);
                    const errorMessage =
                        err instanceof Error
                            ? err.message
                            : "Failed to add season";
                    failedSeasons.push({ seasonNumber, error: errorMessage });
                }
            }

            if (failedSeasons.length === 0) {
                showToast(
                    `Added ${addedSeasons.length} seasons to list`,
                    "success"
                );
            } else if (addedSeasons.length === 0) {
                throw new Error(
                    `Failed to add seasons: ${failedSeasons
                        .map((f) => `Season ${f.seasonNumber}`)
                        .join(", ")}`
                );
            } else {
                showToast(
                    `Added ${addedSeasons.length} seasons. ${failedSeasons.length} failed.`,
                    "warning"
                );
            }
        },
        [tvShowSeasons, tvShowId, contentItem, showToast]
    );

    const handleToggleList = useCallback(
        async (
            listId: number,
            checked: boolean,
            addMode: "show" | "seasons",
            selectedSeasons: Set<number>,
            existingItemId?: number,
            existingSeasonsInList?: Set<number>
        ) => {
            setLoadingListIds((prev) => {
                const next = new Set(prev);
                next.add(listId);
                return next;
            });
            setError(null);

            try {
                if (checked) {
                    // Add to list
                    if (
                        addMode === "seasons" &&
                        selectedSeasons.size > 0 &&
                        tvShowId
                    ) {
                        await addSeasonsToList(
                            listId,
                            Array.from(selectedSeasons),
                            existingSeasonsInList
                        );
                    } else {
                        await addToListMutation.mutateAsync({
                            listId,
                            payload: {
                                source_api: contentItem.source_api as SourceApi,
                                external_id: contentItem.external_id,
                                content_type:
                                    contentItem.content_type as ContentType,
                                status: "PENDING",
                            } as ListItemCreate,
                        });
                        showToast("Added to list", "success");
                    }
                } else {
                    // Remove from list
                    if (addMode === "seasons") {
                        // For seasons, we might need more complex logic to remove specific seasons
                        // For now, let's assume we don't support removing seasons via this bulk toggle yet
                        // or we need to find the items for the selected seasons.
                        // Given the complexity, maybe we just show a message or handle it if we have the IDs.
                        // But the prompt focuses on "Add to List" modal redesign.
                        // Let's assume for 'show' mode it works.
                        showToast(
                            "Removing seasons is not supported in this view yet",
                            "info"
                        );
                        return;
                    }

                    if (existingItemId) {
                        await listItemActions.delete(listId, existingItemId);
                        showToast("Removed from list", "success");
                    } else {
                        console.warn("Cannot remove item: ID not found");
                    }
                }

                await refreshLists();
            } catch (err: unknown) {
                console.error("Error updating list:", err);

                interface ApiError {
                    message: string;
                    response?: {
                        data?: {
                            error?: string;
                            existing_item?: {
                                added_at: string;
                            };
                        };
                    };
                }

                const apiError = err as ApiError;
                const errorMessage =
                    apiError.message || "Failed to update list";

                if (
                    apiError.response?.data?.error === "DUPLICATE_ITEM" &&
                    apiError.response.data.existing_item
                ) {
                    const existing = apiError.response.data.existing_item;
                    const addedDate = new Date(
                        existing.added_at
                    ).toLocaleDateString();
                    showToast(
                        `This item is already in this list (added ${addedDate})`,
                        "info"
                    );
                    await refreshLists();
                } else if (
                    errorMessage.toLowerCase().includes("already") ||
                    errorMessage.toLowerCase().includes("duplicate")
                ) {
                    showToast("This item is already in the list", "info");
                    await refreshLists();
                } else {
                    setError(errorMessage);
                    showToast(errorMessage, "error");
                }
            } finally {
                setLoadingListIds((prev) => {
                    const next = new Set(prev);
                    next.delete(listId);
                    return next;
                });
            }
        },
        [
            contentItem,
            tvShowId,
            addSeasonsToList,
            refreshLists,
            showToast,
            addToListMutation,
        ]
    );

    return {
        loadingListIds,
        creatingNewList,
        error,
        setError,
        handleCreateNewList,
        handleToggleList,
    };
}
