import {
  AlbumDetail,
  ContentItem,
  ContentType,
  MovieDetail,
  TVShowDetail,
  TVSeasonDetail,
  GameDetail,
  BookDetail
} from "@/lib/api/types";
import { getAuthorNames } from "@/lib/utils/authorUtils";
import { VerticalList } from "@/app/_components/common/lists/VerticalList";
import { TrackListItem } from "@/app/_components/common/lists/TrackListItem";

type DetailData = MovieDetail | TVShowDetail | TVSeasonDetail | AlbumDetail | GameDetail | BookDetail | null;

interface TracksSectionProps {
  detailData: DetailData;
  contentItem: ContentItem;
}

function isAlbumDetail(data: DetailData): data is AlbumDetail {
  return data !== null && 'type' in data && data.type === 'ALBUM';
}

export function TracksSection({ detailData, contentItem }: TracksSectionProps) {
  if (contentItem.content_type !== ContentType.ALBUM || !isAlbumDetail(detailData)) return null;

  if (!detailData.tracks || detailData.tracks.length === 0) return null;

  return (
    <div className="container mx-auto px-4 mt-8">
      <h2 className="text-2xl font-bold text-white mb-6">Tracks</h2>
      <VerticalList spacing="md">
        {detailData.tracks.map((track) => (
          <TrackListItem
            key={track.id}
            trackNumber={track.track_number}
            title={track.title}
            artists={track.authors ? getAuthorNames(track.authors) : undefined}
            duration={track.duration_seconds ? formatDuration(track.duration_seconds) : undefined}
            externalUrl={track.external_url || undefined}
            image={detailData.image_url || null}
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
