import { ListItem } from "@/lib/types";
import { GroupedItems, SortOrder, PageSize } from "@/lib/types/listView";
import { Select } from "../../../../common/ui/Select";
import { PaginationControls } from "../../../../common/ui/PaginationControls";
import { ReorderableListItemCard } from "../../../../common/cards/ListItemCard/ReorderableListItemCard";
import { paginateGroup } from "../../utils";

interface GroupedGalleryViewProps {
  groups: GroupedItems<ListItem>[];
  groupPages: Record<string, number>;
  sortOrder: SortOrder;
  pageSize: PageSize;
  isReorderMode: boolean;
  onGroupPageChange: (groupKey: string, page: number) => void;
  onSortOrderChange: (order: SortOrder) => void;
  onPageSizeChange: (size: PageSize) => void;
  onToggleStatus: (itemId: number, currentStatus: string) => void;
  onDelete: (itemId: number) => void;
  onRate: (item: ListItem) => void;
  shouldInviteToRate: (item: ListItem) => boolean;
}

export function GroupedGalleryView({
  groups,
  groupPages,
  sortOrder,
  pageSize,
  isReorderMode,
  onGroupPageChange,
  onSortOrderChange,
  onPageSizeChange,
  onToggleStatus,
  onDelete,
  onRate,
  shouldInviteToRate,
}: GroupedGalleryViewProps) {
  return (
    <div className="space-y-8">
      {groups.map((group) => {
        const groupPage = groupPages[group.groupKey] || 1;
        const pagination = paginateGroup(group, groupPage, pageSize);
        const { paginatedItems, totalPages: groupTotalPages } = pagination;

        return (
          <div key={group.groupKey} className="space-y-4">
            {/* Group Header */}
            <div className="flex items-center pb-2 border-b border-white/10 flex-wrap gap-2">
              <h3 className="text-lg font-semibold text-white">
                {group.groupLabel}
              </h3>
              <span className="text-sm text-white/60">
                ({group.count} {group.count === 1 ? "item" : "items"})
              </span>
              {!isReorderMode && (
                <div className="flex items-center gap-2">
                  <div className="inline-flex items-center gap-1 bg-white/5 rounded-lg p-1">
                    <Select
                      value={sortOrder}
                      onChange={(e) =>
                        onSortOrderChange(e.target.value as SortOrder)
                      }
                      className="px-2 py-1 text-xs rounded cursor-pointer bg-transparent hover:bg-white/10 text-white/60 hover:text-white transition-colors border-0"
                    >
                      <option value="asc">↑ Asc</option>
                      <option value="desc">↓ Desc</option>
                    </Select>
                    <Select
                      value={pageSize}
                      onChange={(e) => {
                        const val = e.target.value;
                        onPageSizeChange(
                          val === "all" ? "all" : (Number(val) as PageSize)
                        );
                      }}
                      className="px-2 py-1 text-xs rounded cursor-pointer bg-transparent hover:bg-white/10 text-white/60 hover:text-white transition-colors border-0"
                    >
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                      <option value="all">All</option>
                    </Select>
                  </div>
                  {pageSize !== "all" && groupTotalPages > 1 && (
                    <PaginationControls
                      currentPage={groupPage}
                      totalPages={groupTotalPages}
                      onPageChange={(page) =>
                        onGroupPageChange(group.groupKey, page)
                      }
                    />
                  )}
                </div>
              )}
            </div>

            {/* Sub-groups or items */}
            {group.subGroups ? (
              <div className="space-y-6 pl-4">
                {group.subGroups.map((subGroup) => {
                  const itemsInPaginatedSet = subGroup.items.filter((item) =>
                    paginatedItems.some((pItem) => pItem.id === item.id)
                  );

                  return itemsInPaginatedSet.length > 0 ? (
                    <div key={subGroup.groupKey} className="space-y-3">
                      {/* Sub-group Header */}
                      <div className="flex items-center gap-2 text-white/80">
                        <h4 className="text-base font-medium">
                          {subGroup.groupLabel}
                        </h4>
                        <span className="text-xs text-white/50">
                          ({subGroup.count})
                        </span>
                      </div>

                      {/* Sub-group Items Grid */}
                      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 3xl:grid-cols-5 4xl:grid-cols-6 5xl:grid-cols-7 6xl:grid-cols-8 gap-4">
                        {itemsInPaginatedSet.map((item) => (
                          <ReorderableListItemCard
                            key={item.id}
                            item={item}
                            activeId={null}
                            onToggleStatus={onToggleStatus}
                            onDelete={onDelete}
                            onRateClick={() => onRate(item)}
                            showRatingInvitation={shouldInviteToRate(item)}
                            isReorderMode={false}
                          />
                        ))}
                      </div>
                    </div>
                  ) : null;
                })}
              </div>
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 3xl:grid-cols-5 4xl:grid-cols-6 5xl:grid-cols-7 6xl:grid-cols-8 gap-4">
                {paginatedItems.map((item) => (
                  <ReorderableListItemCard
                    key={item.id}
                    item={item}
                    activeId={null}
                    onToggleStatus={onToggleStatus}
                    onDelete={onDelete}
                    onRateClick={() => onRate(item)}
                    showRatingInvitation={shouldInviteToRate(item)}
                    isReorderMode={false}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
