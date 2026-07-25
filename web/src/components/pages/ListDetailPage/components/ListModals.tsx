import { useMemo } from "react";
import { EditListModal } from "../../../common/modals/EditListModal";
import { ConfirmDialog } from "../../../common/modals/ConfirmDialog";
import { RatingModal } from "../../../common/modals/RatingModal";
import {
  ContentItem,
  ListItem,
  MemberRating,
  Rating,
  RatingCreate,
  ListType,
  ListVisibility,
  User,
  UserListDetail,
} from "@/lib/types";

interface ListModalsProps {
  list: UserListDetail;
  currentUser: User | null;
  isEditModalOpen: boolean;
  isDeleteListDialogOpen: boolean;
  deleteItemId: number | null;
  ratingModalItem: ListItem | null;
  isRatingModalOpen: boolean;
  actionLoading: boolean;
  onCloseEditModal: () => void;
  onCloseDeleteListDialog: () => void;
  onCloseDeleteItemDialog: () => void;
  onCloseRatingModal: () => void;
  onUpdateList: (
    name: string,
    description?: string,
    listType?: ListType,
    visibility?: ListVisibility,
  ) => Promise<void>;
  onDeleteList: () => Promise<void>;
  onDeleteItem: (itemId: number) => Promise<void>;
  onSubmitRating: (item: ListItem, data: RatingCreate) => Promise<void>;
}

export function ListModals({
  list,
  currentUser,
  isEditModalOpen,
  isDeleteListDialogOpen,
  deleteItemId,
  ratingModalItem,
  isRatingModalOpen,
  actionLoading,
  onCloseEditModal,
  onCloseDeleteListDialog,
  onCloseDeleteItemDialog,
  onCloseRatingModal,
  onUpdateList,
  onDeleteList,
  onDeleteItem,
  onSubmitRating,
}: ListModalsProps) {
  const userExistingRating = useMemo((): Rating | null => {
    if (!ratingModalItem || !currentUser) return null;

    const memberRating = ratingModalItem.member_ratings?.find(
      (rating: MemberRating) => rating.user?.id === currentUser.id,
    );
    if (!memberRating) return null;

    return {
      id: 0,
      user: currentUser,
      content_item: ratingModalItem.content_item as unknown as ContentItem,
      score: String(memberRating.score),
      comment: null,
      spoiler: false,
      is_active: true,
      created_at: "",
      updated_at: "",
    };
  }, [currentUser, ratingModalItem]);

  const handleRatingSubmit = async (data: RatingCreate) => {
    if (!ratingModalItem) return;
    await onSubmitRating(ratingModalItem, data);
  };

  return (
    <>
      <EditListModal
        isOpen={isEditModalOpen}
        onOpenChange={onCloseEditModal}
        onUpdateList={onUpdateList}
        isLoading={actionLoading}
        initialData={
          list
            ? {
                name: list.name,
                description: list.description || "",
                listType: list.list_type,
                visibility: list.visibility,
              }
            : undefined
        }
      />

      <ConfirmDialog
        isOpen={isDeleteListDialogOpen}
        onOpenChange={onCloseDeleteListDialog}
        onConfirm={onDeleteList}
        title="Delete List"
        description={`Are you sure you want to delete "${list.name}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        isLoading={actionLoading}
      />

      <ConfirmDialog
        isOpen={deleteItemId !== null}
        onOpenChange={(open) => {
          if (!open) onCloseDeleteItemDialog();
        }}
        onConfirm={() => {
          if (deleteItemId) return onDeleteItem(deleteItemId);
        }}
        title="Remove Item"
        description="Are you sure you want to remove this item from the list?"
        confirmText="Remove"
        cancelText="Cancel"
        variant="danger"
        isLoading={actionLoading}
      />

      {currentUser && ratingModalItem ? (
        <RatingModal
          isOpen={isRatingModalOpen}
          onOpenChange={(open) => {
            if (!open) onCloseRatingModal();
          }}
          onSubmitRating={handleRatingSubmit}
          existingRating={userExistingRating}
          contentItem={ratingModalItem.content_item as unknown as ContentItem}
          isLoading={actionLoading}
        />
      ) : null}
    </>
  );
}
