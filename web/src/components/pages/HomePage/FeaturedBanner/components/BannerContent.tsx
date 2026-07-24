import { Content } from "@/lib/types";
import { Button } from "@/components/common/ui/Button";
import {
  getContentTypeIcon,
  getContentTypeLabel,
} from "@/lib/icons/contentTypeIcons";
import {
  getAuthors,
  getReleaseDate,
  getOriginalTitle,
  getExtraInfo,
  getFooterInfo,
  isOriginalTitleSame,
} from "../utils";

interface BannerContentProps {
  item: Content;
  onViewDetails: (item: Content) => void;
}

export function BannerContent({ item, onViewDetails }: BannerContentProps) {
  const Icon = getContentTypeIcon(item.type);
  const typeLabel = getContentTypeLabel(item.type);
  const authors = getAuthors(item);
  const releaseDate = getReleaseDate(item);
  const originalTitle = getOriginalTitle(item);
  const extraInfo = getExtraInfo(item);
  const footerInfo = getFooterInfo(item);
  const originalTitleIsSame = isOriginalTitleSame(item);

  return (
    <div className="relative z-30 flex h-full items-end">
      <div className="w-full px-4 pb-20 md:px-12 md:pb-24">
        <div className="mb-1 flex items-center gap-3 md:mb-2">
          <span
            role="img"
            aria-label={`Content type: ${typeLabel}`}
            title={typeLabel}
            className="shrink-0 text-white/90"
          >
            <Icon aria-hidden="true" className="size-6 md:size-8" />
          </span>
          <h2 className="line-clamp-2 text-2xl font-extrabold text-white drop-shadow-text text-balance sm:text-3xl md:text-5xl">
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
          <p className="mt-2 line-clamp-2 max-h-10 max-w-3xl overflow-hidden text-pretty text-xs text-white/90 [overflow-wrap:anywhere] md:mt-3 md:max-h-[4.5rem] md:line-clamp-3 md:text-base">
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
