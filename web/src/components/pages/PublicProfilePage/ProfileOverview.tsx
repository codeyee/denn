import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";

import { VerticalList } from "@/components/common/lists/VerticalList";
import { Button } from "@/components/common/ui/Button";
import type { PublicProfileOverview } from "@/lib/types";
import { CompletedGrid, PublicListGrid } from "./ProfileCollections";
import { ProfileFavorites } from "./ProfileFavorites";
import { ReviewRow } from "./ReviewRow";

interface ProfileOverviewProps {
  username: string;
  overview: PublicProfileOverview;
}

export function ProfileOverview({
  username,
  overview,
}: ProfileOverviewProps) {
  return (
    <div className="space-y-14 py-8 md:py-12">
      <ProfileFavorites favorites={overview.favorites} />

      <ProfileSection
        title="Recent reviews"
        action={
          <SectionLink username={username} tab="progress">
            View all
          </SectionLink>
        }
      >
        {overview.recent_reviews.length > 0 ? (
          <VerticalList spacing="md">
            {overview.recent_reviews.map((rating) => (
              <ReviewRow key={rating.id} rating={rating} />
            ))}
          </VerticalList>
        ) : (
          <ProfileEmpty message="No public reviews yet." />
        )}
      </ProfileSection>

      <ProfileSection
        title="Recently completed"
        action={
          <SectionLink username={username} tab="progress">
            View all
          </SectionLink>
        }
      >
        {overview.recent_completed.length > 0 ? (
          <CompletedGrid items={overview.recent_completed} />
        ) : (
          <ProfileEmpty message="Nothing completed yet." />
        )}
      </ProfileSection>

      <ProfileSection
        title="Public lists"
        action={
          <SectionLink username={username} tab="lists">
            View all
          </SectionLink>
        }
      >
        {overview.public_lists.length > 0 ? (
          <PublicListGrid lists={overview.public_lists} />
        ) : (
          <ProfileEmpty message="No public lists yet." />
        )}
      </ProfileSection>
    </div>
  );
}

function ProfileSection({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-bold text-white">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function SectionLink({
  username,
  tab,
  children,
}: {
  username: string;
  tab: "progress" | "lists";
  children: ReactNode;
}) {
  return (
    <Button asChild variant="ghost">
      <Link
        to="/user/$username"
        params={{ username }}
        search={{ tab, page: 1 }}
      >
        {children}
      </Link>
    </Button>
  );
}

function ProfileEmpty({ message }: { message: string }) {
  return (
    <div className="grid min-h-40 place-items-center rounded-xl border border-dashed border-white/15 bg-list-item-background px-6 text-center text-white/60">
      {message}
    </div>
  );
}
