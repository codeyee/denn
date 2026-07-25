import { useNavigate } from "@tanstack/react-router";

import { VerticalList } from "@/components/common/lists/VerticalList";
import type { ReactNode } from "react";
import {
  usePublicCompletedQuery,
  usePublicListsQuery,
  usePublicRatingsQuery,
} from "@/lib/api/queries/usePublicProfileQueries";
import type {
  ProfileSearchParams,
  PublicProfileTabData,
} from "@/lib/types";
import { CompletedGrid, PublicListGrid } from "./ProfileCollections";
import { ProfileFilters } from "./ProfileFilters";
import { ReviewRow } from "./ReviewRow";
import {
  ProfilePagination,
  ProfileTabEmpty,
  ProfileTabError,
  ProfileTabLoading,
} from "./ProfileTabStates";

interface ProfileTabContentProps {
  username: string;
  search: ProfileSearchParams;
  initialData: PublicProfileTabData | null;
}

export function ProfileTabContent(props: ProfileTabContentProps) {
  if (props.search.tab === "completed") {
    return <CompletedTab {...props} />;
  }
  if (props.search.tab === "ratings") {
    return <RatingsTab {...props} />;
  }
  return <ListsTab {...props} />;
}

function CompletedTab({
  username,
  search,
  initialData,
}: ProfileTabContentProps) {
  const query = usePublicCompletedQuery(
    username,
    search,
    initialData?.tab === "completed" ? initialData.data : undefined,
  );
  const changeSearch = useProfileSearchChange(username, search);
  if (query.isPending) return <ProfileTabLoading />;
  if (query.isError) {
    return <ProfileTabError onRetry={() => void query.refetch()} />;
  }

  return (
    <TabShell
      title="Completed"
      count={query.data.metadata.count}
      search={search}
      onChange={changeSearch}
    >
      {query.data.results.length > 0 ? (
        <CompletedGrid items={query.data.results} />
      ) : (
        <ProfileTabEmpty message="No completed titles match these filters." />
      )}
      <ProfilePagination
        search={search}
        totalPages={query.data.metadata.total_pages}
        onChange={changeSearch}
      />
    </TabShell>
  );
}

function RatingsTab({
  username,
  search,
  initialData,
}: ProfileTabContentProps) {
  const query = usePublicRatingsQuery(
    username,
    search,
    initialData?.tab === "ratings" ? initialData.data : undefined,
  );
  const changeSearch = useProfileSearchChange(username, search);
  if (query.isPending) return <ProfileTabLoading />;
  if (query.isError) {
    return <ProfileTabError onRetry={() => void query.refetch()} />;
  }

  return (
    <TabShell
      title="Ratings & Reviews"
      count={query.data.metadata.count}
      search={search}
      onChange={changeSearch}
    >
      {query.data.results.length > 0 ? (
        <VerticalList spacing="md">
          {query.data.results.map((rating) => (
            <ReviewRow key={rating.id} rating={rating} />
          ))}
        </VerticalList>
      ) : (
        <ProfileTabEmpty message="No ratings match these filters." />
      )}
      <ProfilePagination
        search={search}
        totalPages={query.data.metadata.total_pages}
        onChange={changeSearch}
      />
    </TabShell>
  );
}

function ListsTab({ username, search, initialData }: ProfileTabContentProps) {
  const query = usePublicListsQuery(
    username,
    search,
    initialData?.tab === "lists" ? initialData.data : undefined,
  );
  const changeSearch = useProfileSearchChange(username, search);
  if (query.isPending) return <ProfileTabLoading />;
  if (query.isError) {
    return <ProfileTabError onRetry={() => void query.refetch()} />;
  }

  return (
    <TabShell
      title="Public lists"
      count={query.data.metadata.count}
      search={search}
      onChange={changeSearch}
    >
      {query.data.results.length > 0 ? (
        <PublicListGrid lists={query.data.results} />
      ) : (
        <ProfileTabEmpty message="No public lists match these filters." />
      )}
      <ProfilePagination
        search={search}
        totalPages={query.data.metadata.total_pages}
        onChange={changeSearch}
      />
    </TabShell>
  );
}

function TabShell({
  title,
  count,
  search,
  onChange,
  children,
}: {
  title: string;
  count: number;
  search: ProfileSearchParams;
  onChange: (updates: Partial<ProfileSearchParams>) => void;
  children: ReactNode;
}) {
  return (
    <section className="py-8 md:py-12" aria-labelledby="profile-tab-heading">
      <div className="mb-5 flex items-baseline gap-3">
        <h2 id="profile-tab-heading" className="text-2xl font-bold text-white">
          {title}
        </h2>
        <span className="text-sm text-white/50">{count} total</span>
      </div>
      <ProfileFilters search={search} onChange={onChange} />
      {children}
    </section>
  );
}

function useProfileSearchChange(
  username: string,
  search: ProfileSearchParams,
) {
  const navigate = useNavigate();
  return (
    updates: Partial<ProfileSearchParams>,
    resetPage = true,
  ) => {
    void navigate({
      to: "/user/$username",
      params: { username },
      search: {
        ...search,
        ...updates,
        page: resetPage ? 1 : (updates.page ?? search.page),
      },
      replace: true,
    });
  };
}
