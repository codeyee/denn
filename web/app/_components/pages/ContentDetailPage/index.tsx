"use client";

import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { useAuthStore } from "@/app/_stores/auth-store";
import { ContentType, TVShowDetail } from "@/lib/types";
import { useContentData } from "./hooks/useContentData";
import { useUserRating } from "./hooks/useUserRating";
import { useContentModals } from "./hooks/useContentModals";
import { ContentDetailSkeleton } from "./ContentDetailSkeleton";
import { ContentHeader } from "./components/ContentHeader";
import { AboutSection } from "./components/AboutSection";
import { TracksSection } from "./components/TracksSection";
import { GallerySection } from "./components/GallerySection";
import { SeasonsSection } from "./components/SeasonsSection";
import { ApiAttribution } from "./components/ApiAttribution";
import { RatingsSection } from "./components/RatingsSection";
import { RatingModal } from "@/app/_components/common/modals/RatingModal";
import { AddToListModal } from "@/app/_components/common/modals/AddToListModal";
import { Footer } from "../../layout/Footer";

interface ContentDetailPageProps {
  contentId: number;
}

export function ContentDetailPage({ contentId }: ContentDetailPageProps) {
  const router = useRouter();
  const { user } = useAuthStore();

  const { loading, error, contentItem, detailData, tvShowTitle } = useContentData({
    contentId,
  });

  const rating = useUserRating({
    contentItem,
    user
  });

  const modals = useContentModals();

  const contentItemForModal = useMemo(() => {
    if (!contentItem) return { source_api: "", external_id: "", content_type: "" };
    return {
      source_api: contentItem.source_api,
      external_id: contentItem.external_id,
      content_type: contentItem.content_type,
    };
  }, [contentItem]);

  if (loading) {
    return <ContentDetailSkeleton />;
  }

  if (error || !contentItem) {
    return (
      <div className="relative w-full min-h-screen bg-background-logged-in">
        <div className="container mx-auto px-4 mt-8 py-20">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <p className="text-red-400 text-xl mb-4">Error loading content</p>
              <p className="text-gray-400 mb-4">{error || "Content not found"}</p>
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
    );
  }

  // `detailData` is already populated from `contentItem.source_data` inside
  // `useContentData`, so the only legitimate fallback chain is detailData →
  // a parsed source_data the hook somehow missed → render an explicit
  // "details unavailable" state. We never coerce to the bare ContentItem
  // shape, which lacks `type`/`title`/`image_url` and would crash the banner.
  const displayItem = detailData ?? (contentItem.source_data
    ? (typeof contentItem.source_data === 'string'
      ? JSON.parse(contentItem.source_data)
      : contentItem.source_data)
    : null);

  if (!displayItem) {
    return (
      <div className="relative w-full min-h-screen bg-background-logged-in">
        <div className="container mx-auto px-4 mt-8 py-20">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <p className="text-yellow-400 text-xl mb-4">Details unavailable</p>
              <p className="text-gray-400 mb-4">
                We could not load the metadata for this item right now. Please try again in a moment.
              </p>
              <button
                onClick={() => router.refresh()}
                className="text-white/80 hover:text-white underline"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full min-h-screen bg-background-logged-in">
      <div className="pt-30 pb-20">
        <ContentHeader
          displayItem={displayItem}
          contentItem={contentItem}
          tvShowTitle={tvShowTitle || undefined}
          userRating={rating.userRating}
          isAuthenticated={!!user}
          onAddToList={modals.openAddToListModal}
          onRateContent={modals.openRatingModal}
        />

        <AboutSection
          detailData={detailData}
          contentItem={contentItem}
          userRating={rating.userRating}
          user={user}
          isRatingLoading={rating.isRatingLoading}
          onEditRating={modals.openRatingModal}
          onDeleteRating={rating.handleDeleteRating}
        />

        {contentItem.content_type !== ContentType.SEASON && (
          <RatingsSection
            key={rating.ratingRefreshKey}
            contentItem={contentItem}
            userRating={rating.userRating}
            onEditRating={modals.openRatingModal}
            onDeleteRating={rating.handleDeleteRating}
            isRatingLoading={rating.isRatingLoading}
            user={user}
          />
        )}

        <TracksSection
          detailData={detailData}
          contentItem={contentItem}
        />

        <SeasonsSection
          detailData={detailData}
          contentItem={contentItem}
        />

        <GallerySection
          detailData={detailData}
          contentItem={contentItem}
        />

        <ApiAttribution contentItem={contentItem} />

        <Footer />
      </div>

      {user && (
        <RatingModal
          isOpen={modals.isRatingModalOpen}
          onOpenChange={modals.setIsRatingModalOpen}
          onSubmitRating={rating.handleSubmitRating}
          existingRating={rating.userRating}
          contentItem={contentItem}
          isLoading={rating.isRatingLoading}
        />
      )}

      {user && contentItem && (
        <AddToListModal
          isOpen={modals.isAddToListModalOpen}
          onOpenChange={modals.setIsAddToListModalOpen}
          contentItem={contentItemForModal}
          tvShowSeasons={
            contentItem.content_type === ContentType.TV_SHOW &&
              detailData &&
              "seasons" in detailData &&
              Array.isArray(detailData.seasons) &&
              detailData.seasons.length > 0
              ? (detailData as TVShowDetail).seasons
              : undefined
          }
          tvShowId={
            contentItem.content_type === ContentType.TV_SHOW &&
              detailData &&
              "seasons" in detailData &&
              Array.isArray(detailData.seasons) &&
              detailData.seasons.length > 0
              ? contentItem.external_id
              : undefined
          }
        />
      )}

      <div className="pointer-events-none fixed left-0 right-0 bottom-0 h-16 bg-bottom-gradient z-10" />
    </div>
  );
}
