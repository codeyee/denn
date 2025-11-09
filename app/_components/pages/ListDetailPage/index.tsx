"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { listActions, listItemActions } from "@/lib/api";
import { List, ListItem, ListType } from "@/types/contentTypes";
import { ExpandableListItem, VerticalList } from "../../common/List";
import Navbar from "../../layout/Navbar";
import Footer from "../../layout/Footer";
import { User, Users, Package, Calendar } from "lucide-react";
import { getContentTypeIcon, getContentTypeLabel } from "@/lib/utils/contentTypeUtils";
import { formatReleaseDate } from "@/lib/utils/dateUtils";

interface ListDetailPageProps {
  listId: number;
}

export default function ListDetailPage({ listId }: ListDetailPageProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [list, setList] = useState<List | null>(null);
  const [listItems, setListItems] = useState<ListItem[]>([]);

  useEffect(() => {
    const fetchList = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch list details
        const listData = await listActions.get(listId, true);
        setList(listData as unknown as List);

        // Fetch list items with expanded content_item data
        const itemsResponse = await listItemActions.list(listId, true);
        setListItems(itemsResponse.results as unknown as ListItem[]);
      } catch (err) {
        console.error("Error fetching list:", err);
        setError(err instanceof Error ? err.message : "Failed to load list");
      } finally {
        setLoading(false);
      }
    };

    fetchList();
  }, [listId]);

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="relative w-full min-h-screen bg-background-logged-in">
          <div className="container mx-auto px-4 py-20">
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="text-white text-xl">Loading...</div>
            </div>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  if (error || !list) {
    return (
      <>
        <Navbar />
        <div className="relative w-full min-h-screen bg-background-logged-in">
          <div className="container mx-auto px-4 py-20">
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="text-center">
                <p className="text-red-400 text-xl mb-4">
                  {error || "List not found"}
                </p>
                <button
                  onClick={() => router.back()}
                  className="text-white/80 hover:text-white underline"
                >
                  Go back
                </button>
              </div>
            </div>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  const isShared = list.list_type === ListType.SHARED;
  const ListTypeIcon = isShared ? Users : User;
  const listTypeLabel = isShared ? "Shared List" : "Personal List";
  const memberCount = list.member_count || (list.members?.length || 0).toString();
  const itemCount = list.item_count || listItems.length.toString();

  return (
    <>
      <Navbar />
      <div className="relative w-full min-h-screen bg-background-logged-in">
        <div className="container mx-auto px-4 pt-30 pb-8">
          {/* Header Section */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <ListTypeIcon className="w-8 h-8 text-white/80" />
              <div>
                <h1 className="text-3xl md:text-4xl font-bold text-white">
                  {list.name}
                </h1>
                <p className="text-white/60 text-sm">{listTypeLabel}</p>
              </div>
            </div>

            {list.description && (
              <p className="text-gray-300 text-lg mb-4">{list.description}</p>
            )}

            <div className="flex flex-wrap gap-6 text-sm text-white/80">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4" />
                <span>
                  {itemCount} {parseInt(itemCount) === 1 ? "item" : "items"}
                </span>
              </div>
              {isShared && (
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  <span>
                    {memberCount}{" "}
                    {parseInt(memberCount) === 1 ? "member" : "members"}
                  </span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <User className="w-4 h-4" />
                <span>
                  Created by {list.owner.username || list.owner.email}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>
                  Created {formatReleaseDate(list.created_at)}
                </span>
              </div>
            </div>
          </div>

          {/* List Items Section */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-4">Items</h2>
            {listItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Package className="w-16 h-16 text-gray-400 opacity-50 mb-4" />
                <p className="text-gray-400 text-lg">This list is empty</p>
                <p className="text-gray-500 text-sm">
                  Add items to get started
                </p>
              </div>
            ) : (
              <VerticalList spacing="md">
                {listItems.map((item) => {
                  const contentItem = item.content_item;
                  const sourceData = contentItem.source_data;
                  const ContentIcon = getContentTypeIcon(contentItem.content_type);
                  const contentTypeLabel = getContentTypeLabel(contentItem.content_type);

                  // Use the legacy image URL helper to handle both old and new image structures
                  const imageUrl = sourceData?.image_url;

                  return (
                    <ExpandableListItem
                      key={item.id}
                      title={sourceData?.title || "Untitled"}
                      description={
                        sourceData?.original_title &&
                        sourceData.original_title !== sourceData.title
                          ? sourceData.original_title
                          : undefined
                      }
                      image={imageUrl}
                      imageAlt={sourceData?.title}
                      imageFullHeight={true}
                      leadingContent={
                        <div className="flex items-center gap-3">
                          {/* Item number */}
                          <div className="text-white/60 text-sm font-mono w-8 text-center">
                            #{item.list_order}
                          </div>
                          {/* Content type icon */}
                          <ContentIcon className="w-5 h-5 text-white/60" />
                        </div>
                      }
                      trailingContent={
                        <div className="flex items-center gap-3">
                          {/* Status badge */}
                          {item.status && (
                            <div className="px-2 py-1 bg-white/10 rounded text-xs text-white/80">
                              {item.status}
                            </div>
                          )}
                          {/* Rating */}
                          {item.list_rating && (
                            <div className="text-yellow-400 text-sm font-medium">
                              ★ {item.list_rating}
                            </div>
                          )}
                        </div>
                      }
                      expandedContent={
                        <div className="space-y-3">
                          {sourceData?.description && (
                            <div>
                              <h4 className="text-white/80 font-semibold text-sm mb-1">
                                Description
                              </h4>
                              <p className="text-white/60 text-sm leading-relaxed">
                                {sourceData.description}
                              </p>
                            </div>
                          )}

                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                              <span className="text-white/60">Type:</span>
                              <span className="text-white ml-2">
                                {contentTypeLabel}
                              </span>
                            </div>
                            {sourceData?.release_date && (
                              <div>
                                <span className="text-white/60">
                                  Release Date:
                                </span>
                                <span className="text-white ml-2">
                                  {formatReleaseDate(sourceData.release_date)}
                                </span>
                              </div>
                            )}
                            {sourceData?.duration_minutes && (
                              <div>
                                <span className="text-white/60">Duration:</span>
                                <span className="text-white ml-2">
                                  {sourceData.duration_minutes} min
                                </span>
                              </div>
                            )}
                            {item.added_at && (
                              <div>
                                <span className="text-white/60">Added:</span>
                                <span className="text-white ml-2">
                                  {formatReleaseDate(item.added_at)}
                                </span>
                              </div>
                            )}
                          </div>

                          {item.notes && (
                            <div>
                              <h4 className="text-white/80 font-semibold text-sm mb-1">
                                Notes
                              </h4>
                              <p className="text-white/60 text-sm">
                                {item.notes}
                              </p>
                            </div>
                          )}

                          <div className="pt-2 border-t border-white/10">
                            <p className="text-white/60 text-xs">
                              Added by {item.added_by.username || item.added_by.email}
                            </p>
                          </div>
                        </div>
                      }
                    />
                  );
                })}
              </VerticalList>
            )}
          </div>

          {/* Members Section (for shared lists) */}
          {isShared && list.members && list.members.length > 0 && (
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-white mb-4">Members</h2>
              <VerticalList spacing="sm">
                {list.members.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center gap-3 p-3 bg-white/5 rounded-lg"
                  >
                    <User className="w-5 h-5 text-white/60" />
                    <div>
                      <p className="text-white font-medium">
                        {member.username || member.email}
                      </p>
                      {member.first_name && member.last_name && (
                        <p className="text-white/60 text-sm">
                          {member.first_name} {member.last_name}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </VerticalList>
            </div>
          )}
        </div>
      </div>
      <Footer />
    </>
  );
}
