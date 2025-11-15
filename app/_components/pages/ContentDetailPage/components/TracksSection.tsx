import {
  AlbumDetail,
  ContentItem,
  ContentType,
  MovieDetail,
  TVShowDetail,
  GameDetail,
  BookDetail,
  TVSeasonDetail
} from "@/lib/api/types";
import { getAuthorNames } from "@/lib/utils/authorUtils";
import { VerticalList } from "@/app/_components/common/lists/VerticalList";
import { TrackListItem } from "@/app/_components/common/lists/TrackListItem";

interface TracksSectionProps {
  detailData: MovieDetail | TVShowDetail | AlbumDetail | GameDetail | BookDetail | TVSeasonDetail | null;
  contentItem: ContentItem;
}

export function TracksSection({ detailData, contentItem }: TracksSectionProps) {
  if (contentItem.content_type !== ContentType.ALBUM || !detailData) return null;

  const album = detailData as AlbumDetail;
  if (!album.tracks || album.tracks.length === 0) return null;

  return (
    <div className="container mx-auto px-4 mt-8">
      <h2 className="text-2xl font-bold text-white mb-6">Tracks</h2>
      <VerticalList spacing="md">
        {album.tracks.map((track) => (
          <TrackListItem
            key={track.id}
            trackNumber={track.track_number}
            title={track.title}
            artists={track.authors ? getAuthorNames(track.authors) : undefined}
            duration={track.duration_seconds ? formatDuration(track.duration_seconds) : undefined}
            externalUrl={track.external_url || undefined}
            image={album.image_url || null}
          />
        ))}
      </VerticalList>
    </div>
  );
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}
