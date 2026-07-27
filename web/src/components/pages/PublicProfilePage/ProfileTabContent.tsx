import { useNavigate } from "@tanstack/react-router";
import { LoaderCircle } from "lucide-react";

import type { ReactNode } from "react";
import {
  usePublicListsQuery,
  usePublicProgressQuery,
} from "@/lib/api/queries/usePublicProfileQueries";
import type {
  ProfileSearchParams,
  PublicProfileTabData,
} from "@/lib/types";
import { PublicListGrid } from "./ProfileCollections";
import { ProgressCollection } from "./ProgressCollection";
import { ProfileFilters } from "./ProfileFilters";
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
  if (props.search.tab === "progress") {
    return <ProgressTab {...props} />;
  }
  return <ListsTab {...props} />;
}

function ProgressTab({
  username,
  search,
  initialData,
}: ProfileTabContentProps) {
  const query = usePublicProgressQuery(
    username,
    search,
    initialData?.tab === "progress" ? initialData.data : undefined,
  );
  const changeSearch = useProfileSearchChange(username, search);
  if (query.isPending) return <ProfileTabLoading />;
  if (query.isError) {
    return <ProfileTabError onRetry={() => void query.refetch()} />;
  }

  return (
    <TabShell
      title="Progress"
      count={query.data.metadata.count}
      search={search}
      onChange={changeSearch}
      isUpdating={query.isFetching}
    >
      {query.data.results.length > 0 ? (
        <ProgressCollection
          items={query.data.results}
          view={search.view ?? "grid"}
        />
      ) : (
        <ProfileTabEmpty message="No progress matches these filters." />
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
      isUpdating={query.isFetching}
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
  isUpdating,
  children,
}: {
  title: string;
  count: number;
  search: ProfileSearchParams;
  onChange: (updates: Partial<ProfileSearchParams>) => void;
  isUpdating: boolean;
  children: ReactNode;
}) {
  return (
    <section className="py-8 md:py-12" aria-labelledby="profile-tab-heading">
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <h2 id="profile-tab-heading" className="text-2xl font-bold text-white">
          {title}
        </h2>
        <span className="text-sm text-white/50">{count} total</span>
        {isUpdating ? (
          <span
            role="status"
            aria-live="polite"
            className="ml-auto inline-flex items-center gap-2 text-xs font-medium text-white/55"
          >
            <LoaderCircle
              aria-hidden="true"
              className="size-3.5 animate-spin motion-reduce:animate-none"
            />
            Updating results
          </span>
        ) : null}
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
