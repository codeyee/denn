import Image from "next/image";
import {
  MovieDetail,
  TVShowDetail,
  TVSeasonDetail,
  AlbumDetail,
  GameDetail,
  BookDetail,
  ContentItem,
  ContentType,
  Rating,
  User
} from "@/lib/types";
import { formatReleaseDate } from "@/lib/utils/dateUtils";
import { MovieDetailContent } from "../contents/MovieDetailContent";
import { TVShowDetailContent } from "../contents/TVShowDetailContent";
import { SeasonDetailContent } from "../contents/SeasonDetailContent";
import { GameDetailContent } from "../contents/GameDetailContent";
import { BookDetailContent } from "../contents/BookDetailContent";

interface AboutSectionProps {
  detailData: MovieDetail | TVShowDetail | TVSeasonDetail | AlbumDetail | GameDetail | BookDetail | null;
  contentItem: ContentItem;
  userRating: Rating | null;
  user: User | null;
  isRatingLoading: boolean;
  onEditRating: () => void;
  onDeleteRating: () => void;
}

export function AboutSection({
  detailData,
  contentItem,
  userRating,
  user,
  isRatingLoading,
  onEditRating,
  onDeleteRating
}: AboutSectionProps) {
  if (!detailData) {
    return (
      <div className="container mx-auto px-4 mt-8">
        <div className="mb-10">
          <h2 className="text-2xl font-bold text-white mb-6">Content Details</h2>
          <p className="text-gray-400">Detailed information not available.</p>
        </div>
      </div>
    );
  }

  const contentType = contentItem.content_type;

  if (contentType === ContentType.MOVIE) {
    return <MovieDetailContent movie={detailData as MovieDetail} />;
  }

  if (contentType === ContentType.TV_SHOW) {
    return <TVShowDetailContent tvShow={detailData as TVShowDetail} />;
  }

  if (contentType === ContentType.SEASON) {
    return (
      <SeasonDetailContent
        season={detailData as TVSeasonDetail}
        contentItem={contentItem}
        userRating={userRating}
        onEditRating={onEditRating}
        onDeleteRating={onDeleteRating}
        isRatingLoading={isRatingLoading}
        user={user}
      />
    );
  }

  if (contentType === ContentType.ALBUM) {
    const album = detailData as AlbumDetail;
    const releaseDate = formatReleaseDate(album.release_date);
    return (
      <div className="container mx-auto px-4 mt-8">
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
                <Image
                  src="/images/logos/spotify.svg"
                  alt="Spotify"
                  width={28}
                  height={28}
                  className="h-7 w-auto"
                />
              </a>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (contentType === ContentType.GAME) {
    return <GameDetailContent game={detailData as GameDetail} />;
  }

  if (contentType === ContentType.BOOK) {
    return <BookDetailContent book={detailData as BookDetail} />;
  }

  return (
    <div className="container mx-auto px-4 mt-8">
      <div className="mb-10">
        <h2 className="text-2xl font-bold text-white mb-6">Content Details</h2>
        <p className="text-gray-400">Content type not supported.</p>
      </div>
    </div>
  );
}
