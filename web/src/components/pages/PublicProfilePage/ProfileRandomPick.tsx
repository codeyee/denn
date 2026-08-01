import { useMemo, useState } from "react";
import { Dices } from "lucide-react";

import {
  RandomPickerModal,
  type RandomPickerItem,
} from "@/components/common/random";
import { Button } from "@/components/common/ui/Button";
import { useSetTrackingStatusMutation } from "@/lib/api/mutations";
import { trackingActions } from "@/lib/api";
import type {
  PublicProgressItem,
  RandomTrackingPick,
} from "@/lib/types";

export function ProfileRandomPick({
  items,
}: {
  items: PublicProgressItem[];
}) {
  const [isOpen, setIsOpen] = useState(false);
  const setTrackingStatus = useSetTrackingStatusMutation();
  const preview = useMemo(
    () => items.filter((item) => item.status === "backlog").map(toPickerItem),
    [items],
  );

  return (
    <div className="mb-7 flex justify-start md:justify-end">
      <Button
        variant="outline"
        size="lg"
        onClick={() => setIsOpen(true)}
        className="gap-2 border-amber-300/30 text-amber-100 hover:bg-amber-300/10 hover:text-amber-50"
      >
        <Dices className="h-5 w-5" aria-hidden="true" />
        Choose something to do
      </Button>
      <RandomPickerModal
        isOpen={isOpen}
        onOpenChange={setIsOpen}
        title="Choose something to do"
        description="Pick one item from your planned progress."
        previewItems={preview}
        emptyMessage="Your planned progress is empty. Add something to a personal list to get started."
        autoDrawOnOpen
        onDraw={async (excludeContentId) => {
          const response = await trackingActions.pickRandom(
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
    </div>
  );
}

function toPickerItem(item: PublicProgressItem | RandomTrackingPick): RandomPickerItem {
  return {
    id: "id" in item ? item.id : item.tracking_id,
    contentId: item.content.id,
    title: item.content.title,
    subtitle: item.content.subtitle,
    imageUrl: item.content.poster,
    contentType: item.content.type,
    status: item.status,
  };
}
