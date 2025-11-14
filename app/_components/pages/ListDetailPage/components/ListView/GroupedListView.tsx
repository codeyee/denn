import { ListItem } from "@/types";
import { GroupedItems, SortOrder, PageSize } from "@/types/listView";
import { Select } from "../../../../common/ui/Select";
import { PaginationControls } from "../../../../common/ui/PaginationControls";
import { VerticalList } from "../../../../common/List";
import { ListItemRenderer } from "../ListItemRenderer";
import { paginateGroup, paginateSubGroup, paginateSubGroups } from "../../utils";

interface GroupedListViewProps {
  groups: GroupedItems<ListItem>[];
  groupPages: Record<string, number>;
  subGroupPages: Record<string, number>;
  sortOrder: SortOrder;
  pageSize: PageSize;
  isReorderMode: boolean;
  onGroupPageChange: (groupKey: string, page: number) => void;
  onSubGroupPageChange: (subGroupKey: string, page: number) => void;
  onSortOrderChange: (order: SortOrder) => void;
  onPageSizeChange: (size: PageSize) => void;
  onToggleStatus: (itemId: number, currentStatus: string) => void;
  onDelete: (itemId: number) => void;
  onRate: (item: ListItem) => void;
  shouldInviteToRate: (item: ListItem) => boolean;
}

export function GroupedListView({
  groups,
  groupPages,
  subGroupPages,
  sortOrder,
  pageSize,
  isReorderMode,
  onGroupPageChange,
  onSubGroupPageChange,
  onSortOrderChange,
  onPageSizeChange,
  onToggleStatus,
  onDelete,
  onRate,
  shouldInviteToRate,
}: GroupedListViewProps) {
  return (
    <div className="space-y-6">
      {groups.map((group) => {
        const groupPage = groupPages[group.groupKey] || 1;
        const subGroupPagination = group.subGroups
          ? paginateSubGroups(group.subGroups, groupPage, pageSize)
          : { paginatedSubGroups: [], totalPages: 0 };
        const { paginatedSubGroups, totalPages: subGroupTotalPages } =
          subGroupPagination;

        const itemPagination = !group.subGroups
          ? paginateGroup(group, groupPage, pageSize)
          : { paginatedItems: [], totalPages: 0 };
        const { paginatedItems, totalPages: groupTotalPages } = itemPagination;

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
                <div className="flex items-center gap-1">
                  <Select
                    value={sortOrder}
                    onChange={(e) =>
                      onSortOrderChange(e.target.value as SortOrder)
                    }
                    className="px-2 py-1 text-xs rounded cursor-pointer bg-white/5 hover:bg-white/10 text-white border border-white/20"
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
                    className="px-2 py-1 text-xs rounded cursor-pointer bg-white/5 hover:bg-white/10 text-white border border-white/20"
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value="all">All</option>
                  </Select>
                  {pageSize !== "all" &&
                    (group.subGroups
                      ? subGroupTotalPages > 1
                      : groupTotalPages > 1) && (
                      <PaginationControls
                        currentPage={groupPage}
                        totalPages={
                          group.subGroups ? subGroupTotalPages : groupTotalPages
                        }
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
              <div className="space-y-4 pl-4">
                {paginatedSubGroups.map((subGroup) => {
                  const subGroupPageKey = `${group.groupKey}-${subGroup.groupKey}`;
                  const subGroupPage = subGroupPages[subGroupPageKey] || 1;
                  const {
                    paginatedItems: subGroupPaginatedItems,
                    totalPages: subGroupItemsTotalPages,
                  } = paginateSubGroup(subGroup, subGroupPage, pageSize);

                  return (
                    <div key={subGroup.groupKey} className="space-y-2">
                      {/* Sub-group Header */}
                      <div className="flex items-center gap-2 text-white/80">
                        <h4 className="text-base font-medium">
                          {subGroup.groupLabel}
                        </h4>
                        <span className="text-xs text-white/50">
                          ({subGroup.count})
                        </span>
                        {pageSize !== "all" && subGroupItemsTotalPages > 1 && (
                          <PaginationControls
                            currentPage={subGroupPage}
                            totalPages={subGroupItemsTotalPages}
                            onPageChange={(page) =>
                              onSubGroupPageChange(subGroupPageKey, page)
                            }
                          />
                        )}
                      </div>

                      {/* Sub-group Items */}
                      <VerticalList spacing="md">
                        {subGroupPaginatedItems.map((item) => (
                          <ListItemRenderer
                            key={item.id}
                            item={item}
                            activeId={null}
                            isReorderMode={isReorderMode}
                            onToggleStatus={onToggleStatus}
                            onDelete={onDelete}
                            onRate={onRate}
                            shouldInviteToRate={shouldInviteToRate}
                          />
                        ))}
                      </VerticalList>
                    </div>
                  );
                })}
              </div>
            ) : (
              <VerticalList spacing="md">
                {paginatedItems.map((item) => (
                  <ListItemRenderer
                    key={item.id}
                    item={item}
                    activeId={null}
                    isReorderMode={isReorderMode}
                    onToggleStatus={onToggleStatus}
                    onDelete={onDelete}
                    onRate={onRate}
                    shouldInviteToRate={shouldInviteToRate}
                  />
                ))}
              </VerticalList>
            )}
          </div>
        );
      })}
    </div>
  );
}
