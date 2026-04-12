import { ListItem, UserListDetail } from "@/lib/types";
import { GroupedItems } from "@/lib/types/listView";
import { ListItemCard } from "../../../../common/cards/ListItemCard";

interface GroupedGalleryViewProps {
  groups: GroupedItems<ListItem>[];
  highlightedItemId: number | null;
  list: UserListDetail;
  currentUserId?: number;
  onToggleStatus: (itemId: number, currentStatus: string) => void;
  onDelete: (itemId: number) => void;
  onRate: (item: ListItem) => void;
  shouldInviteToRate: (item: ListItem) => boolean;
}

function GroupGalleryBlock({
  groups,
  highlightedItemId,
  list,
  currentUserId,
  onToggleStatus,
  onDelete,
  onRate,
  shouldInviteToRate,
}: GroupedGalleryViewProps) {
  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <div key={group.groupKey} className="space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-white/10">
            <h3 className="text-lg font-semibold text-white">{group.groupLabel}</h3>
            <span className="text-sm text-white/60">
              ({group.count} {group.count === 1 ? "item" : "items"})
            </span>
          </div>

          {group.subGroups ? (
            <div className="pl-4">
              <GroupGalleryBlock
                groups={group.subGroups}
                highlightedItemId={highlightedItemId}
                list={list}
                currentUserId={currentUserId}
                onToggleStatus={onToggleStatus}
                onDelete={onDelete}
                onRate={onRate}
                shouldInviteToRate={shouldInviteToRate}
              />
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 3xl:grid-cols-5 4xl:grid-cols-6 5xl:grid-cols-7 6xl:grid-cols-8 gap-4">
              {group.items.map((item) => (
                <div
                  key={item.id}
                  data-list-item-id={item.id}
                >
                  <ListItemCard
                    item={item}
                    list={list}
                    currentUserId={currentUserId}
                    onToggleStatus={onToggleStatus}
                    onDelete={onDelete}
                    onRateClick={() => onRate(item)}
                    showRatingInvitation={shouldInviteToRate(item)}
                    className={
                      item.id === highlightedItemId
                        ? "ring-2 ring-amber-400 ring-offset-2 ring-offset-background-logged-in rounded-2xl"
                        : undefined
                    }
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export function GroupedGalleryView(props: GroupedGalleryViewProps) {
  return <GroupGalleryBlock {...props} />;
}
