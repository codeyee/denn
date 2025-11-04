"use client";

import { AlbumDetail, Track } from "@/lib/api/types";
import { ExternalLink } from "lucide-react";

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
      <div className="bg-white/5 rounded-2xl p-6 md:p-8 mb-6">
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
        <div className="bg-white/5 rounded-2xl p-6 md:p-8">
          <h2 className="text-2xl font-bold text-white mb-6">Tracks</h2>
          <div className="space-y-2">
            {album.tracks.map((track) => (
              <div
                key={track.id}
                className="bg-white/5 rounded-lg p-4 hover:bg-white/10 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="flex-shrink-0 w-8 text-center">
                    <span className="text-white/60 text-sm font-medium">
                      {track.track_number}
                    </span>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-white font-medium mb-1">{track.title}</h3>
                    {track.authors && track.authors.length > 0 && (
                      <p className="text-gray-400 text-sm">{track.authors.join(", ")}</p>
                    )}
                  </div>
                  <div className="flex-shrink-0 text-right">
                    {track.duration_seconds && (
                      <span className="text-white/60 text-sm">
                        {formatDuration(track.duration_seconds)}
                      </span>
                    )}
                  </div>
                  {track.external_url && (
                    <a
                      href={track.external_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-shrink-0 text-white/60 hover:text-white transition-colors"
                      aria-label={`Open ${track.title} in Spotify`}
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

