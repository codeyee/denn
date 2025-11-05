"use client";

import { AlbumDetail, Track } from "@/lib/api/types";
import { ExternalLink } from "lucide-react";
import { VerticalList } from "@/app/_components/common/List";
import TrackListItem from "@/app/_components/common/List/TrackListItem";

interface AlbumDetailContentProps {
  album: AlbumDetail;
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return "Unknown";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export default function AlbumDetailContent({ album }: AlbumDetailContentProps) {
  return (
    <>
      <div className="p-6 md:p-8 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Left Column */}
          <div>
            <h2 className="text-2xl font-bold text-white mb-4">About</h2>

            <div className="mt-6 space-y-2">
              {album.authors && album.authors.length > 0 && (
                <div>
                  <span className="text-white/60 text-sm">Artists:</span>
                  <span className="text-white ml-2">{album.authors.join(", ")}</span>
                </div>
              )}
              {album.release_date && (
                <div>
                  <span className="text-white/60 text-sm">Release Date:</span>
                  <span className="text-white ml-2">{album.release_date}</span>
                </div>
              )}
              {album.album_type && (
                <div>
                  <span className="text-white/60 text-sm">Type:</span>
                  <span className="text-white ml-2 capitalize">{album.album_type}</span>
                </div>
              )}
              {album.total_tracks !== undefined && (
                <div>
                  <span className="text-white/60 text-sm">Tracks:</span>
                  <span className="text-white ml-2">{album.total_tracks}</span>
                </div>
              )}
              {album.duration_minutes !== undefined && (
                <div>
                  <span className="text-white/60 text-sm">Duration:</span>
                  <span className="text-white ml-2">
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
                  className="inline-flex items-center gap-2 text-white/80 hover:text-white underline"
                >
                  <ExternalLink className="w-4 h-4" />
                  Open in Spotify
                </a>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tracks Section */}
      {album.tracks && album.tracks.length > 0 && (
        <div className="p-6 md:p-8">
          <h2 className="text-2xl font-bold text-white mb-6">Tracks</h2>
          <VerticalList spacing="md">
            {album.tracks.map((track) => (
              <TrackListItem
                key={track.id}
                trackNumber={track.track_number}
                title={track.title}
                artists={track.authors || undefined}
                duration={
                  track.duration_seconds
                    ? formatDuration(track.duration_seconds)
                    : undefined
                }
                externalUrl={track.external_url || undefined}
              />
            ))}
          </VerticalList>
        </div>
      )}
    </>
  );
}

