import { useMemo, useState } from "react";
import { Dices } from "lucide-react";

import {
  RandomPickerModal,
  type RandomPickerItem,
} from "@/components/common/random";
import { Button } from "@/components/common/ui/Button";
import { useSetTrackingStatusMutation } from "@/lib/api/mutations";
import { listActions } from "@/lib/api";
import { ListType, type ListItem, type UserListDetail } from "@/lib/types";
import { getCardImageUrl } from "@/lib/utils/imageUtils";
import { getListItemSubtitle, getListItemTitle } from "@/components/common/cards/ListItemCard/utils";

const RANDOM_ENABLED_DYNAMIC_KEYS = new Set([
  "backlog",
  "movies",
  "series",
  "games",
  "albums",
  "books",
]);

interface DynamicListRandomPickProps {
  list: UserListDetail;
  previewItems: ListItem[];
}

export function DynamicListRandomPick({
  list,
  previewItems,
}: DynamicListRandomPickProps) {
  const [isOpen, setIsOpen] = useState(false);
  const setTrackingStatus = useSetTrackingStatusMutation();
  const canPick =
    list.list_type !== ListType.DYNAMIC ||
    RANDOM_ENABLED_DYNAMIC_KEYS.has(list.dynamic_key ?? "");
  const preview = useMemo(
    () => previewItems.map(toPickerItem),
    [previewItems],
  );

  if (!canPick) return null;

  return (
    <>
      <div className="mb-6 flex justify-start md:justify-end">
        <Button
          variant="outline"
          size="lg"
          onClick={() => setIsOpen(true)}
          className="gap-2 border-amber-300/30 text-amber-100 hover:bg-amber-300/10 hover:text-amber-50"
        >
          <Dices className="h-5 w-5" aria-hidden="true" />
          Choose for me
        </Button>
      </div>
      <RandomPickerModal
        isOpen={isOpen}
        onOpenChange={setIsOpen}
        title="Choose for me"
        description="Pick something planned from this list."
        previewItems={preview}
        emptyMessage="There are no planned items to choose from yet."
        autoDrawOnOpen
        onDraw={async (excludeContentId) => {
          const response = await listActions.pickRandom(
            list.id,
            excludeContentId ? [excludeContentId] : [],
          );
          return response.result ? toPickerItem(response.result) : null;
        }}
        onStart={async (item) => {
          await setTrackingStatus.mutateAsync({
            contentId: item.contentId,
            status: "in_progress",
          });
        }}
      />
    </>
  );
}

function toPickerItem(item: ListItem): RandomPickerItem {
  const sourceData = item.content_item.source_data;
  const title = getListItemTitle(item);
  const contentType = item.content_item.content_type;

  return {
    id: item.id,
    contentId: item.content_item.id,
    title,
    subtitle: getListItemSubtitle(item),
    imageUrl: getCardImageUrl(sourceData?.images, sourceData?.image_url),
    contentType,
    status: item.content_item.current_user_tracking?.status ?? null,
  };
}
