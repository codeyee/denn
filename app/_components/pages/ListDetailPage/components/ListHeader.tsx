import { Users, Lock } from "lucide-react";
import { UserListDetail, ListType } from "@/lib/types";

interface ListHeaderProps {
  list: UserListDetail;
}

export function ListHeader({ list }: ListHeaderProps) {
  const isShared = list.list_type === ListType.SHARED;
  const ListTypeIcon = isShared ? Users : Lock;
  const listTypeLabel = isShared ? "Shared List" : "Personal List";

  return (
    <div className="mb-8">
      <div className="flex items-center gap-3 mb-4">
        <ListTypeIcon className="w-8 h-8 text-white/80" />
        <div className="flex-1">
          <h1 className="text-3xl md:text-4xl font-bold text-white">
            {list.name}
          </h1>
          <p className="text-white/60 text-sm">{listTypeLabel}</p>
        </div>
      </div>

      {list.description && (
        <p className="text-gray-300 text-lg mb-4">{list.description}</p>
      )}
    </div>
  );
}
