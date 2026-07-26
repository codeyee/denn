import type { RefObject } from "react";
import { CalendarDays, Heart, List, Star, Trophy } from "lucide-react";

import { BannerShell } from "@/components/common/media/BannerShell";
import { ResponsiveMedia } from "@/components/common/media/ResponsiveMedia";
import { Button } from "@/components/common/ui/Button";
import { UserAvatar } from "@/components/common/ui/UserAvatar";
import type { ProfileBannerMedia, PublicProfileOverview } from "@/lib/types";
import { formatJoinedAt } from "./utils";

interface ProfileBannerProps {
  overview: PublicProfileOverview;
  bannerMedia?: ProfileBannerMedia;
  isOwner: boolean;
  editButtonRef: RefObject<HTMLButtonElement | null>;
  onEdit: () => void;
}

export function ProfileBanner({
  overview,
  bannerMedia,
  isOwner,
  editButtonRef,
  onEdit,
}: ProfileBannerProps) {
  const { profile, counters } = overview;

  return (
    <BannerShell
      media={
        bannerMedia ? (
          <ResponsiveMedia
            src={bannerMedia.image_url}
            alt=""
            width={1600}
            height={900}
            sizes="100vw"
            priority
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : undefined
      }
    >
      <div className="w-full px-4 pb-12 md:px-12 md:pb-16">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="flex min-w-0 items-end gap-4">
            <UserAvatar
              avatarUrl={profile.avatar_url}
              username={profile.username}
              alt={`${profile.username}'s avatar`}
              className="h-20 w-20 border-2 border-white/80 text-2xl shadow-xl md:h-28 md:w-28 md:text-4xl"
            />
            <div className="min-w-0 pb-1">
              <h1 className="truncate text-3xl font-black tracking-tight text-white drop-shadow-text md:text-5xl">
                @{profile.username}
              </h1>
              {profile.bio ? (
                <p className="mt-2 max-w-2xl text-sm text-white/85 md:text-base">
                  {profile.bio}
                </p>
              ) : null}
              <p className="mt-2 flex items-center gap-2 text-sm text-white/65">
                <CalendarDays aria-hidden="true" className="h-4 w-4" />
                Joined {formatJoinedAt(profile.joined_at)}
              </p>
            </div>
          </div>
          {isOwner ? (
            <Button
              ref={editButtonRef}
              type="button"
              variant="secondary"
              className="self-start bg-white text-black hover:bg-white/90 md:self-auto"
              aria-haspopup="dialog"
              onClick={onEdit}
            >
              Edit profile
            </Button>
          ) : null}
        </div>
        <dl className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <ProfileStat icon={Trophy} label="Completed" value={counters.completed} />
          <ProfileStat icon={Star} label="Ratings" value={counters.ratings} />
          <ProfileStat icon={Heart} label="Reviews" value={counters.reviews} />
          <ProfileStat icon={List} label="Public lists" value={counters.public_lists} />
        </dl>
      </div>
    </BannerShell>
  );
}

function ProfileStat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Trophy;
  label: string;
  value: number;
}) {
  return (
    <div className="grid min-h-14 grid-cols-[auto_1fr] items-center gap-x-3 rounded-xl border border-white/10 bg-black/35 px-3 py-2 backdrop-blur-sm">
      <Icon
        aria-hidden="true"
        className="row-span-2 h-4 w-4 text-white/75"
      />
      <dt className="self-end text-xs text-white/60">{label}</dt>
      <dd className="self-start text-lg font-bold text-white">{value}</dd>
    </div>
  );
}
