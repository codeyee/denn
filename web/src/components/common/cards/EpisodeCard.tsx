
import { motion } from "motion/react";
import { Tv } from "lucide-react";
import { ResponsiveMedia } from "@/components/common/media/ResponsiveMedia";
import { TVEpisode } from "@/lib/types";
import { formatReleaseDate } from "@/lib/utils/dateUtils";

interface EpisodeCardProps {
  episode: TVEpisode;
  className?: string;
  onOpenGallery?: () => void;
}

export function EpisodeCard({ episode, className = "", onOpenGallery }: EpisodeCardProps) {
  const title = episode.title || `Episode ${episode.episode_number}`;
  const imageUrl = episode.image_url || undefined;
  const releaseDate = formatReleaseDate(episode.release_date);
  const duration = episode.duration_minutes ? `${episode.duration_minutes} min` : "";

  const card = (
    <motion.div
      key={episode.id}
      className={`w-full ${className}`}
      style={{ aspectRatio: "16 / 9" }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
    >
      <div className="relative overflow-hidden rounded-2xl h-full bg-transparent backdrop-blur-lg p-0! border-none!">
        {imageUrl ? (
          <ResponsiveMedia
            src={imageUrl}
            alt={`${title} still`}
            width={640}
            height={360}
            sizes="(max-width: 767px) 88vw, 40vw"
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div
            className="absolute inset-0 flex items-center justify-center bg-empty-card"
          >
            <Tv aria-hidden="true" className="w-16 h-16 md:w-20 md:h-20 text-gray-300 opacity-60" />
            <span className="sr-only">No artwork available for {title}</span>
          </div>
        )}

        {/* Overlay layer */}
        {imageUrl && <div className="absolute inset-0 bg-black/20" />}
        <div 
          className={`absolute inset-x-0 bottom-0 h-[55%] bg-linear-to-t ${
            imageUrl
              ? 'from-black/95 via-black/40 to-transparent'
              : 'from-gray-700/80 via-gray-600/40 to-transparent'
          }`}
        />

        {/* Content layer */}
        <div className="relative z-10 h-full flex flex-col justify-end">
          <div className="w-full px-4 md:px-6 pb-4 md:pb-6 pt-3 md:pt-5">
            {/* Title section */}
            <div className="flex items-center gap-2 md:gap-3 text-white mb-2 md:mb-3">
              <Tv className="w-5 h-5 md:w-6 md:h-6 shrink-0 drop-shadow-text" />
              <span className="text-base md:text-lg font-bold drop-shadow-text line-clamp-3">
                {title}
              </span>
            </div>

            {/* Footer with release date and duration */}
            <div className="flex items-center gap-1 text-[10px] md:text-xs text-white/80 font-sans drop-shadow-text">
              <div className="flex items-center gap-3 flex-wrap">
                {releaseDate && (
                  <span>{releaseDate}</span>
                )}
                {duration && (
                  <>
                    {releaseDate && <span className="text-white/40">•</span>}
                    <span>{duration}</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );

  if (!imageUrl || !onOpenGallery) return card;

  return (
    <button
      type="button"
      onClick={onOpenGallery}
      aria-label={`Open ${title} in gallery`}
      aria-haspopup="dialog"
      className="group block w-full cursor-pointer rounded-2xl text-left outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      {card}
    </button>
  );
}
