import { useRef, useState } from "react";

import { usePublicProfileOverviewQuery } from "@/lib/api/queries/usePublicProfileQueries";
import type {
  ProfileBannerMedia,
  ProfileSearchParams,
  PublicProfileOverview,
  PublicProfileTabData,
} from "@/lib/types";
import { useAuthStore } from "@/stores/auth-store";
import { COMPACT_BANNER_SIZE } from "@/components/common/media/BannerShell";
import { EditProfileModal } from "./EditProfileModal";
import { ProfileBanner } from "./ProfileBanner";
import { ProfileOverview } from "./ProfileOverview";
import { ProfileTabContent } from "./ProfileTabContent";
import { ProfileTabs } from "./ProfileTabs";

interface PublicProfilePageProps {
  username: string;
  search: ProfileSearchParams;
  initialOverview: PublicProfileOverview;
  initialTabData: PublicProfileTabData | null;
  initialBannerMedia?: ProfileBannerMedia;
}

export function PublicProfilePage({
  username,
  search,
  initialOverview,
  initialTabData,
  initialBannerMedia,
}: PublicProfilePageProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [bannerMedia] = useState(initialBannerMedia);
  const editButtonRef = useRef<HTMLButtonElement>(null);
  const overviewQuery = usePublicProfileOverviewQuery(
    username,
    initialOverview,
  );
  const viewer = useAuthStore((state) => state.user);

  if (overviewQuery.isPending) {
    return <PublicProfileSkeleton />;
  }
  if (overviewQuery.isError) {
    throw overviewQuery.error;
  }

  const overview = overviewQuery.data;
  const isOwner = viewer?.username === overview.profile.username;

  function handleEditOpenChange(open: boolean) {
    setIsEditing(open);
    if (!open) {
      window.requestAnimationFrame(() => editButtonRef.current?.focus());
    }
  }

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="relative min-h-screen w-full bg-background-logged-in"
    >
      <div className="pb-20 pt-30">
        <section className="relative z-0 -mt-30">
          <ProfileBanner
            overview={overview}
            bannerMedia={bannerMedia}
            isOwner={isOwner}
            editButtonRef={editButtonRef}
            onEdit={() => setIsEditing(true)}
          />
        </section>
        <div className="mx-auto w-full max-w-[1800px] px-4 md:px-8 lg:px-12">
          <ProfileTabs username={username} search={search}>
            {search.tab === "overview" ? (
              <ProfileOverview username={username} overview={overview} />
            ) : (
              <ProfileTabContent
                username={username}
                search={search}
                initialData={initialTabData}
              />
            )}
          </ProfileTabs>
        </div>
      </div>
      {isOwner ? (
        <EditProfileModal
          isOpen={isEditing}
          onOpenChange={handleEditOpenChange}
          profile={overview.profile}
        />
      ) : null}
    </main>
  );
}

export function PublicProfileSkeleton() {
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="min-h-screen animate-pulse bg-background-logged-in motion-reduce:animate-none"
    >
      <div className="pb-20 pt-30">
        <div className={`-mt-30 bg-white/[0.07] md:rounded-2xl ${COMPACT_BANNER_SIZE}`} />
        <div className="mx-auto max-w-[1800px] px-4 md:px-8 lg:px-12">
          <div className="mt-6 h-12 rounded-xl bg-list-item-background" />
          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="aspect-5/8 rounded-2xl bg-list-item-background" />
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
