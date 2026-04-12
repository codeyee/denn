import { ListItem, UserListDetail } from "@/lib/types";
import { GroupedItems } from "@/lib/types/listView";
import { VerticalList } from "../../../../common/lists/VerticalList";
import { ListItemRenderer } from "../ListItemRenderer";

interface GroupedListViewProps {
  groups: GroupedItems<ListItem>[];
  highlightedItemId: number | null;
  list: UserListDetail;
  currentUserId?: number;
  onToggleStatus: (itemId: number, currentStatus: string) => void;
  onDelete: (itemId: number) => void;
  onRate: (item: ListItem) => void;
  shouldInviteToRate: (item: ListItem) => boolean;
}

function GroupItemsBlock({
  groups,
  highlightedItemId,
  list,
  currentUserId,
  onToggleStatus,
  onDelete,
  onRate,
  shouldInviteToRate,
}: GroupedListViewProps) {
  return (
    <div className="space-y-4">
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
              <GroupItemsBlock
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
            <VerticalList spacing="md">
              {group.items.map((item) => (
                <ListItemRenderer
                  key={item.id}
                  item={item}
                  activeId={null}
                  isHighlighted={item.id === highlightedItemId}
                  isReorderMode={false}
                  list={list}
                  currentUserId={currentUserId}
                  onToggleStatus={onToggleStatus}
                  onDelete={onDelete}
                  onRate={onRate}
                  shouldInviteToRate={shouldInviteToRate}
                />
              ))}
            </VerticalList>
          )}
        </div>
      ))}
    </div>
  );
}

export function GroupedListView(props: GroupedListViewProps) {
  return <GroupItemsBlock {...props} />;
}
