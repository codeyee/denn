import { Content } from "@/types";
import { ContentType } from "@/lib/api/types";
import { Film, Tv, Gamepad2, Book, Music, LucideIcon } from "lucide-react";
import { Button } from "@/app/_components/common/ui/Button";
import {
  getAuthors,
  getReleaseDate,
  getOriginalTitle,
  getExtraInfo,
  getFooterInfo,
  isOriginalTitleSame,
} from "../utils";

const TYPE_ICON_MAP: Record<string, LucideIcon> = {
  [ContentType.MOVIE]: Film,
  [ContentType.TV_SHOW]: Tv,
  [ContentType.GAME]: Gamepad2,
  [ContentType.BOOK]: Book,
  [ContentType.ALBUM]: Music,
};

interface BannerContentProps {
  item: Content;
  onViewDetails: (item: Content) => void;
}

export function BannerContent({ item, onViewDetails }: BannerContentProps) {
  const Icon = TYPE_ICON_MAP[item.type];
  const authors = getAuthors(item);
  const releaseDate = getReleaseDate(item);
  const originalTitle = getOriginalTitle(item);
  const extraInfo = getExtraInfo(item);
  const footerInfo = getFooterInfo(item);
  const originalTitleIsSame = isOriginalTitleSame(item);

  return (
    <div className="relative z-30 h-full flex items-end">
      <div className="w-full px-4 md:px-12 pb-16 md:pb-20">
        <div className="flex items-center gap-3 mb-1 md:mb-2">
          {Icon && <Icon className="w-6 h-6 md:w-8 md:h-8 text-white/90" />}
          <h2 className="text-white font-extrabold text-2xl sm:text-3xl md:text-5xl drop-shadow-text line-clamp-3">
            {item.title}
          </h2>
        </div>

        <div className="mt-2 md:mt-3 text-white/85 space-y-1 font-sans">
          {originalTitle && !originalTitleIsSame && (
            <div className="text-sm md:text-base opacity-90">
              {originalTitle}
            </div>
          )}
          {authors && (
            <div className="text-xs md:text-sm opacity-90">{authors}</div>
          )}
          {releaseDate && (
            <div className="text-xs md:text-sm opacity-90">{releaseDate}</div>
          )}
          {extraInfo && (
            <div className="text-xs md:text-sm opacity-90">{extraInfo}</div>
          )}
          {footerInfo && (
            <div className="text-xs md:text-sm opacity-90">{footerInfo}</div>
          )}
        </div>

        {"description" in item && item.description && (
          <p className="mt-2 md:mt-3 text-white/90 max-w-3xl md:line-clamp-3 md:text-base font-sans text-xs">
            {item.description}
          </p>
        )}

        <div className="mt-3 md:mt-5 flex items-center gap-3">
          <Button
            onClick={() => onViewDetails(item)}
            className="bg-white text-black hover:bg-white/90 cursor-pointer text-xs md:text-sm"
          >
            View details <span className="ml-2">-&gt;</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
