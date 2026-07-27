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
} from "lucide-react";
import { UserListDetail, ListType } from "@/lib/types";
import { Button } from "@/components/common/ui/Button";
import { formatReleaseDate } from "@/lib/utils/dateUtils";
import { formatUserDisplayNameWithUsername } from "@/lib/utils/userUtils";
import { DynamicListRandomPick } from "./DynamicListRandomPick";

interface ListSidebarProps {
  list: UserListDetail;
  itemCount: number;
  totalItemCount: number;
  completedCount: number;
  pendingCount: number;
  completionRate: number;
  isReorderMode: boolean;
  reorderLoading: boolean;
  reorderPreparing: boolean;
  itemsLoading: boolean;
  reorderDisabledReason?: string;
  onEditList: () => void;
  onDeleteList: () => void;
  onEnterReorderMode: () => void;
  onCancelReorder: () => void;
  onSaveReorder: () => void;
}

export function ListSidebar({
  list,
  itemCount,
  totalItemCount,
  completedCount,
  pendingCount,
  completionRate,
  isReorderMode,
  reorderLoading,
  reorderPreparing,
  itemsLoading,
  reorderDisabledReason,
  onEditList,
  onDeleteList,
  onEnterReorderMode,
  onCancelReorder,
  onSaveReorder,
}: ListSidebarProps) {
  const isShared = list.list_type === ListType.SHARED;
  const isDynamic = list.list_type === ListType.DYNAMIC;
  const memberCount = (list.members?.length || 0).toString();
  const reorderBlocked = Boolean(reorderDisabledReason);

  return (
    <div className="w-full md:w-80 lg:w-96 shrink-0 space-y-6 order-1 md:order-2 md:sticky md:top-24 md:self-start md:max-h-[calc(100vh-8rem)] md:overflow-y-auto">
      <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
        <h3 className="text-xl font-bold text-white mb-4">List Actions</h3>
        <div className="space-y-3">
          {!isReorderMode ? (
            <>
              <Button
                onClick={onEnterReorderMode}
                className="w-full flex items-center justify-center gap-2 cursor-pointer bg-blue-600 text-white hover:bg-blue-700 font-semibold"
                size="lg"
                disabled={itemCount === 0 || reorderPreparing || reorderBlocked}
                title={reorderDisabledReason}
              >
                <GripVertical className="w-5 h-5" />
                {reorderPreparing ? "Preparing reorder..." : "Reorder Items"}
              </Button>
              {reorderBlocked && (
                <p className="text-xs text-amber-400/80 -mt-1">
                  {reorderDisabledReason}
                </p>
              )}
              {!isDynamic ? (
                <>
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
                <p className="text-xs text-white/55">
                  Progress updates the items automatically. Your order stays personal.
                </p>
              )}
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

      <DynamicListRandomPick list={list} />

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
                {totalItemCount}
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
