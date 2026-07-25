import { usePublicProfileOverviewQuery } from "@/lib/api/queries/usePublicProfileQueries";
import type {
  ProfileSearchParams,
  PublicProfileOverview,
  PublicProfileTabData,
} from "@/lib/types";
import { useAuthStore } from "@/stores/auth-store";
import { ProfileBanner } from "./ProfileBanner";
import { ProfileOverview } from "./ProfileOverview";
import { ProfileTabContent } from "./ProfileTabContent";
import { ProfileTabs } from "./ProfileTabs";

interface PublicProfilePageProps {
  username: string;
  search: ProfileSearchParams;
  initialOverview: PublicProfileOverview;
  initialTabData: PublicProfileTabData | null;
}

export function PublicProfilePage({
  username,
  search,
  initialOverview,
  initialTabData,
}: PublicProfilePageProps) {
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

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="min-h-screen bg-background-logged-in pt-20"
    >
      <div className="mx-auto w-full max-w-[1800px] md:px-4 lg:px-8">
        <ProfileBanner overview={overview} isOwner={isOwner} />
        <div className="px-4 md:px-8">
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
    </main>
  );
}

export function PublicProfileSkeleton() {
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="min-h-screen animate-pulse bg-background-logged-in px-4 pt-20 motion-reduce:animate-none"
    >
      <div className="mx-auto max-w-[1800px]">
        <div className="aspect-16/13 rounded-2xl bg-white/[0.07] lg:aspect-16/7" />
        <div className="mt-6 h-12 rounded-xl bg-white/[0.07]" />
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="aspect-5/8 rounded-2xl bg-white/[0.07]" />
          ))}
        </div>
      </div>
    </main>
  );
}
