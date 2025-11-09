"use client";

import { AlbumDetail, Track } from "@/lib/api/types";
import { VerticalList } from "@/app/_components/common/List";
import TrackListItem from "@/app/_components/common/List/TrackListItem";
import { formatReleaseDate } from "@/lib/utils/dateUtils";
import { getAuthorNames } from "@/lib/utils/authorUtils";

interface AlbumDetailContentProps {
  album: AlbumDetail;
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return "";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export default function AlbumDetailContent({ album }: AlbumDetailContentProps) {
  const releaseDate = formatReleaseDate(album.release_date);
  return (
    <div className="container mx-auto px-4">
      <div className="mb-10">
        <h2 className="text-2xl font-bold text-white mb-6">About</h2>

        <div className="mt-6 space-y-2">
            {releaseDate && (
              <div>
                <span className="text-white/60 font-bold">Release Date:</span>
                <span className="text-white ml-2 font-sans">{releaseDate}</span>
              </div>
            )}
            {album.album_type && (
              <div>
                <span className="text-white/60 font-bold">Type:</span>
                <span className="text-white ml-2 capitalize font-sans">{album.album_type}</span>
              </div>
            )}
            {album.total_tracks !== undefined && (
              <div>
                <span className="text-white/60 font-bold">Tracks:</span>
                <span className="text-white ml-2 font-sans">{album.total_tracks}</span>
              </div>
            )}
            {album.duration_minutes !== undefined && album.duration_minutes !== null && (
              <div>
                <span className="text-white/60 font-bold">Duration:</span>
                <span className="text-white ml-2 font-sans">
                  {Math.floor(album.duration_minutes)} minutes
                </span>
              </div>
            )}
        </div>

        {album.external_url && (
          <div className="mt-6">
            <a
              href={album.external_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer"
            >
              <img
                src="/images/logos/spotify.svg"
                alt="Spotify"
                className="h-7 w-auto"
              />
            </a>
          </div>
        )}
      </div>

      {/* Tracks Section */}
      {album.tracks && album.tracks.length > 0 && (
        <div className="container mx-auto px-4 mb-10">
          <h2 className="text-2xl font-bold text-white mb-6">Tracks</h2>
          <VerticalList spacing="md">
            {album.tracks.map((track) => (
              <TrackListItem
                key={track.id}
                trackNumber={track.track_number}
                title={track.title}
                artists={track.authors ? getAuthorNames(track.authors) : undefined}
                duration={
                  track.duration_seconds
                    ? formatDuration(track.duration_seconds)
                    : undefined
                }
                externalUrl={track.external_url || undefined}
                image={album.image_url || null}
              />
            ))}
          </VerticalList>
        </div>
      )}
    </div>
  );
}

