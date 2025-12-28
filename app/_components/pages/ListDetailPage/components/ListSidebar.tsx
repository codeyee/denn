import {
  User,
  Users,
  Package,
  Calendar,
  Edit,
  Trash2,
  CheckCircle,
  Circle,
  GripVertical,
  Save,
  X,
  Layers,
} from "lucide-react";
import { UserListDetail, ListType } from "@/lib/types";
import { GroupBy, SortBy } from "@/lib/types/listView";
import { Button } from "@/app/_components/common/ui/Button";
import { Select } from "../../../common/ui/Select";
import { formatReleaseDate } from "@/lib/utils/dateUtils";
import { formatUserDisplayNameWithUsername } from "@/lib/utils/userUtils";

interface ListSidebarProps {
  list: UserListDetail;
  itemCount: number;
  totalItemCount: number;
  completedCount: number;
  pendingCount: number;
  completionRate: number;
  groups: GroupBy[];
  sortBy: SortBy;
  isReorderMode: boolean;
  reorderLoading: boolean;
  itemsLoading: boolean;
  allItemsLoaded: boolean;
  onEditList: () => void;
  onDeleteList: () => void;
  onEnterReorderMode: () => void;
  onCancelReorder: () => void;
  onSaveReorder: () => void;
  onGroupChange: (groups: GroupBy[]) => void;
  onSortByChange: (sortBy: SortBy) => void;
}

export function ListSidebar({
  list,
  itemCount,
  totalItemCount,
  completedCount,
  pendingCount,
  completionRate,
  groups,
  sortBy,
  isReorderMode,
  reorderLoading,
  itemsLoading,
  allItemsLoaded,
  onEditList,
  onDeleteList,
  onEnterReorderMode,
  onCancelReorder,
  onSaveReorder,
  onGroupChange,
  onSortByChange,
}: ListSidebarProps) {
  const isShared = list.list_type === ListType.SHARED;
  const memberCount = (list.members?.length || 0).toString();

  const availableGroups: { value: GroupBy; label: string }[] = [
    { value: "status", label: "Status" },
    { value: "content_type", label: "Content Type" },
    { value: "date_added", label: "Date Added" },
    { value: "rating", label: "Rating" },
  ];

  const handleToggleGroup = (group: GroupBy, checked: boolean) => {
    if (checked) {
      // Add to groups if not present (max 3)
      if (!groups.includes(group) && groups.length < 3) {
        onGroupChange([...groups, group]);
      }
    } else {
      // Remove from groups
      onGroupChange(groups.filter((g) => g !== group));
    }
  };

  return (
    <div className="w-full md:w-80 lg:w-96 shrink-0 space-y-6 order-1 md:order-2 md:sticky md:top-24 md:self-start md:max-h-[calc(100vh-8rem)] md:overflow-y-auto">
      {/* List Actions Card */}
      <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
        <h3 className="text-xl font-bold text-white mb-4">List Actions</h3>
        <div className="space-y-3">
          {!isReorderMode ? (
            <>
              <Button
                onClick={onEnterReorderMode}
                className="w-full flex items-center justify-center gap-2 cursor-pointer bg-blue-600 text-white hover:bg-blue-700 font-semibold"
                size="lg"
                disabled={itemCount === 0 || !allItemsLoaded}
              >
                <GripVertical className="w-5 h-5" />
                {itemsLoading ? "Loading items..." : "Reorder Items"}
              </Button>
              <Button
                onClick={onEditList}
                className="w-full flex items-center justify-center gap-2 cursor-pointer bg-white text-black hover:bg-white/90 font-semibold"
                size="lg"
              >
                <Edit className="w-5 h-5" />
                Edit List
              </Button>
              <Button
                onClick={onDeleteList}
                variant="destructive"
                className="w-full flex items-center justify-center gap-2 cursor-pointer font-semibold"
                size="lg"
              >
                <Trash2 className="w-5 h-5" />
                Delete List
              </Button>
            </>
          ) : (
            <>
              <Button
                onClick={onSaveReorder}
                className="w-full flex items-center justify-center gap-2 cursor-pointer bg-green-600 text-white hover:bg-green-700 font-semibold"
                size="lg"
                disabled={reorderLoading}
              >
                <Save className="w-5 h-5" />
                {reorderLoading ? "Saving..." : "Save Order"}
              </Button>
              <Button
                onClick={onCancelReorder}
                variant="outline"
                className="w-full flex items-center justify-center gap-2 cursor-pointer font-semibold"
                size="lg"
                disabled={reorderLoading}
              >
                <X className="w-5 h-5" />
                Cancel
              </Button>
            </>
          )}
        </div>
      </div>

      {/* List Stats Card */}
      <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
        <h3 className="text-xl font-bold text-white mb-4">Stats</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-white/60">
              <Package className="w-4 h-4" />
              <span>Total Items</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-white font-bold text-lg">
                {allItemsLoaded ? itemCount : `${itemCount}/${totalItemCount}`}
              </span>
              {itemsLoading && (
                <div className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
              )}
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-green-400">
              <CheckCircle className="w-4 h-4" />
              <span>Completed</span>
            </div>
            <span className="text-white font-bold text-lg">
              {completedCount}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-white/60">
              <Circle className="w-4 h-4" />
              <span>Pending</span>
            </div>
            <span className="text-white font-bold text-lg">{pendingCount}</span>
          </div>
          {itemCount > 0 && (
            <div className="pt-3 border-t border-white/10">
              <div className="flex items-center justify-between text-sm">
                <span className="text-white/60">Completion Rate</span>
                <span className="text-white font-bold">{completionRate}%</span>
              </div>
              <div className="mt-2 w-full bg-white/10 rounded-full h-2">
                <div
                  className="bg-green-500 h-2 rounded-full transition-all"
                  style={{ width: `${completionRate}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* List Controls Card */}
      <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
        <h3 className="text-xl font-bold text-white mb-4">View Options</h3>
        <div className="space-y-6">
          {/* Grouping Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-foreground/80 flex items-center gap-2">
                <Layers className="w-4 h-4" />
                Group By
              </h4>
              {groups.length > 0 && (
                <button
                  onClick={() => onGroupChange([])}
                  className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                  disabled={isReorderMode}
                >
                  Clear All
                </button>
              )}
            </div>

            <div className="space-y-2">
              {availableGroups.map((group) => {
                const isChecked = groups.includes(group.value);
                const index = groups.indexOf(group.value);
                const isDisabled = isReorderMode || (!isChecked && groups.length >= 3);

                return (
                  <label
                    key={group.value}
                    className={`
                      flex items-center justify-between p-2 rounded-lg border transition-all cursor-pointer
                      ${isChecked
                        ? "bg-blue-500/10 border-blue-500/30"
                        : "bg-white/5 border-white/10 hover:bg-white/10"
                      }
                      ${isDisabled ? "opacity-50 cursor-not-allowed" : ""}
                    `}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => handleToggleGroup(group.value, e.target.checked)}
                        disabled={isDisabled}
                        className="w-4 h-4 rounded border-gray-500 text-blue-500 focus:ring-blue-500 bg-transparent"
                      />
                      <span className="text-sm text-white">{group.label}</span>
                    </div>
                    {isChecked && (
                      <span className="text-xs bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded-full font-mono">
                        {index + 1}
                      </span>
                    )}
                  </label>
                );
              })}
            </div>
            <p className="text-xs text-white/40">
              Select up to 3 attributes to group items.
            </p>
          </div>

          {/* Sorting Section */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-foreground/80">
              Sorting
            </h4>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                Sort by
              </label>
              <Select
                value={sortBy}
                onChange={(e) => onSortByChange(e.target.value as SortBy)}
                disabled={isReorderMode}
                className="w-full px-3 py-2 text-sm rounded-md cursor-pointer bg-white/5 hover:bg-white/10 text-white border border-white/20 disabled:opacity-50"
              >
                <option value="list_order">Default Order</option>
                <option value="added_at">Date Added</option>
                <option value="name">Name</option>
                <option value="completed_at">Completed Date</option>
                <option value="list_rating">Rating</option>
                <option value="added_by">Added By</option>
                <option value="content_type">Type</option>
              </Select>
            </div>
          </div>
        </div>
      </div>

      {/* List Info Card */}
      <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
        <h3 className="text-xl font-bold text-white mb-4">Info</h3>
        <div className="space-y-3 text-sm">
          <div className="flex items-start gap-2">
            <User className="w-4 h-4 text-white/60 mt-0.5" />
            <div className="flex-1">
              <div className="text-white/60">Owner</div>
              {(() => {
                const { displayName, username } =
                  formatUserDisplayNameWithUsername(list.owner);
                return (
                  <>
                    <div className="text-white font-medium">{displayName}</div>
                    {username && (
                      <div className="text-white/50 text-xs">@{username}</div>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
          {isShared && (
            <div className="flex items-start gap-2">
              <Users className="w-4 h-4 text-white/60 mt-0.5" />
              <div className="flex-1">
                <div className="text-white/60">Members</div>
                <div className="text-white font-medium">
                  {memberCount}{" "}
                  {parseInt(memberCount) === 1 ? "member" : "members"}
                </div>
              </div>
            </div>
          )}
          <div className="flex items-start gap-2">
            <Calendar className="w-4 h-4 text-white/60 mt-0.5" />
            <div className="flex-1">
              <div className="text-white/60">Created</div>
              <div className="text-white font-medium">
                {formatReleaseDate(list.created_at)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Members Section (for shared lists) */}
      {isShared && list.members && list.members.length > 0 && (
        <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
          <h3 className="text-xl font-bold text-white mb-4">Members</h3>
          <div className="space-y-2">
            {list.members.map((member) => {
              const { displayName, username } =
                formatUserDisplayNameWithUsername(member);
              return (
                <div
                  key={member.id}
                  className="flex items-center gap-3 p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <User className="w-5 h-5 text-white/60" />
                  <div>
                    <p className="text-white font-medium">{displayName}</p>
                    {username && (
                      <p className="text-white/60 text-sm">@{username}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
