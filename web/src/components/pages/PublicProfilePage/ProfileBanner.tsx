import type { RefObject } from "react";
import {
  CalendarDays,
  Heart,
  List,
  Pencil,
  Star,
  Trophy,
} from "lucide-react";

import {
  BANNER_MEDIA_POSITION,
  BannerShell,
} from "@/components/common/media/BannerShell";
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
            className={`absolute inset-0 h-full w-full object-cover ${BANNER_MEDIA_POSITION}`}
          />
        ) : undefined
      }
    >
      <div className="w-full px-4 pb-6 md:px-12 md:pb-8">
        <div className="flex items-end justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-end gap-3 md:gap-4">
            <UserAvatar
              avatarUrl={profile.avatar_url}
              username={profile.username}
              alt={`${profile.username}'s avatar`}
              className="h-16 w-16 border-2 border-white/80 text-xl shadow-md md:h-20 md:w-20 md:text-3xl"
            />
            <div className="min-w-0 pb-1">
              <h1 className="truncate text-xl font-black tracking-tight text-white drop-shadow-text sm:text-2xl md:text-4xl">
                @{profile.username}
              </h1>
              {profile.bio ? (
                <p className="mt-1 line-clamp-1 max-w-2xl text-xs text-white/85 md:text-sm">
                  {profile.bio}
                </p>
              ) : null}
              <p className="mt-1 flex items-center gap-1.5 text-xs text-white/70 md:text-sm">
                <CalendarDays aria-hidden="true" className="h-3.5 w-3.5" />
                Joined {formatJoinedAt(profile.joined_at)}
              </p>
            </div>
          </div>
          {isOwner ? (
            <Button
              ref={editButtonRef}
              type="button"
              variant="secondary"
              size="sm"
              className="size-11 shrink-0 bg-white px-0 text-black hover:bg-white/90 sm:w-auto sm:px-3"
              aria-label="Edit profile"
              aria-haspopup="dialog"
              onClick={onEdit}
            >
              <Pencil aria-hidden="true" className="h-4 w-4" />
              <span className="hidden sm:inline">Edit profile</span>
            </Button>
          ) : null}
        </div>
        <dl className="mt-4 grid grid-cols-4 gap-2">
          <ProfileStat icon={Trophy} label="Completed" value={counters.completed} />
          <ProfileStat icon={Star} label="Ratings" value={counters.ratings} />
          <ProfileStat icon={Heart} label="Reviews" value={counters.reviews} />
          <ProfileStat icon={List} label="Lists" value={counters.public_lists} />
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
    <div className="grid min-h-14 place-items-center gap-0.5 rounded-lg bg-black/55 px-1 py-1.5 text-center sm:grid-cols-[auto_1fr] sm:gap-x-3 sm:px-3 sm:py-2 sm:text-left">
      <Icon
        aria-hidden="true"
        className="h-4 w-4 text-white/75 sm:row-span-2"
      />
      <dt className="max-w-full truncate text-[10px] text-white/70 sm:self-end sm:text-xs">
        {label}
      </dt>
      <dd className="text-base font-bold text-white sm:self-start sm:text-lg">
        {value}
      </dd>
    </div>
  );
}
