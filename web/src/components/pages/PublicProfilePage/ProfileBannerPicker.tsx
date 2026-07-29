import { ChevronDown, Check, Shuffle } from "lucide-react";

import {
  CONTENT_TYPE_DEFINITIONS,
  FILTERABLE_CONTENT_TYPES,
} from "@/lib/contentTypes";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/common/ui/Dropdown";
import { Button } from "@/components/common/ui/Button";
import type { ContentType, ProfileBannerOption } from "@/lib/types";
import { ProfileBannerImageGrid } from "./ProfileBannerImageGrid";

interface ProfileBannerPickerProps {
  options: ProfileBannerOption[];
  contentId: number | null;
  imageId: number | null;
  onContentChange: (contentId: number | null) => void;
  onImageChange: (imageId: number | null) => void;
}

export function ProfileBannerPicker({
  options,
  contentId,
  imageId,
  onContentChange,
  onImageChange,
}: ProfileBannerPickerProps) {
  const groupedOptions = groupBannerOptions(options);
  const selectedOption = options.find(
    (option) =>
      option.content_id === contentId && option.image_id === imageId,
  );
  const imageOptions = options.filter(
    (option) => option.content_id === contentId,
  );
  return (
    <fieldset className="space-y-4">
      <legend className="text-sm font-medium">Profile banner</legend>
      <p className="text-xs leading-5 text-white/60">
        Choose a favorite, then use its best image or a specific gallery or
        cover image. Clearing this returns the banner to the random fallback.
      </p>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className="min-h-11 w-full justify-between border-white/15 bg-black/20 px-3 text-left text-white hover:bg-white/10 hover:text-white"
            aria-label="Favorite used for the profile banner"
            aria-haspopup="menu"
          >
            <span className="flex min-w-0 items-center gap-2">
              {selectedOption ? (
                <ContentTypeIcon
                  type={selectedOption.type}
                  className="size-4 shrink-0 text-white/70"
                />
              ) : (
                <Shuffle aria-hidden="true" className="size-4 shrink-0 text-white/70" />
              )}
              {selectedOption ? (
                <BannerOptionText option={selectedOption} />
              ) : (
                <span className="truncate">Use a random favorite</span>
              )}
            </span>
            <ChevronDown aria-hidden="true" className="size-4 shrink-0 text-white/60" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          className="max-h-72 w-[min(24rem,calc(100vw-4rem))] overflow-y-auto border-white/15 bg-[#1d131c] p-2"
        >
          <DropdownMenuItem
            role="menuitemradio"
            aria-checked={contentId === null}
            onClick={() => onContentChange(null)}
            className="min-h-11 gap-3 px-3 text-white/80 hover:bg-white/10"
          >
            <Shuffle aria-hidden="true" className="size-4 shrink-0 text-white/60" />
            <span className="min-w-0 flex-1 truncate">Use a random favorite</span>
            {contentId === null ? <Check aria-hidden="true" className="size-4" /> : null}
          </DropdownMenuItem>
          {groupedOptions.map(([type, typeOptions]) => {
            const definition = CONTENT_TYPE_DEFINITIONS[type];
            return (
              <div key={type} className="mt-2 first:mt-1">
                <div className="mx-2 flex items-center gap-2 border-b border-white/15 px-1 py-2 text-xs font-semibold text-white/50">
                  <ContentTypeIcon
                    type={type}
                    className="size-3.5"
                  />
                  <span>{definition.pluralLabel}</span>
                </div>
                {typeOptions.map((option) => {
                  const isSelected = option.content_id === contentId;
                  return (
                    <DropdownMenuItem
                      key={option.content_id}
                      role="menuitemradio"
                      aria-checked={isSelected}
                      onClick={() => onContentChange(option.content_id)}
                      className="min-h-11 gap-3 px-3 text-white/85 hover:bg-white/10"
                    >
                      <ContentTypeIcon
                        type={option.type}
                        className="size-4 shrink-0 text-white/60"
                      />
                      <BannerOptionText option={option} />
                      {isSelected ? <Check aria-hidden="true" className="size-4" /> : null}
                    </DropdownMenuItem>
                  );
                })}
              </div>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>

      {contentId !== null && imageOptions.length > 0 ? (
        <ProfileBannerImageGrid
          options={imageOptions}
          imageId={imageId}
          onImageChange={onImageChange}
        />
      ) : null}
    </fieldset>
  );
}

function groupBannerOptions(options: ProfileBannerOption[]) {
  const byType = new Map<ContentType, ProfileBannerOption[]>();
  for (const option of options) {
    const current = byType.get(option.type) ?? [];
    if (!current.some((item) => item.content_id === option.content_id)) {
      current.push(option);
    }
    byType.set(option.type, current);
  }

  return FILTERABLE_CONTENT_TYPES
    .filter((type) => byType.has(type))
    .map((type) => [type, byType.get(type) ?? []] as const);
}

function ContentTypeIcon({
  type,
  className,
}: {
  type: ContentType;
  className?: string;
}) {
  const Icon = CONTENT_TYPE_DEFINITIONS[type]?.icon;
  return Icon ? <Icon aria-hidden="true" className={className} /> : null;
}

function BannerOptionText({ option }: { option: ProfileBannerOption }) {
  return (
    <span className="min-w-0 flex-1">
      <span className="block truncate">{option.title}</span>
      {option.authors?.length ? (
        <span className="block truncate text-xs font-normal text-white/55">
          {option.authors.join(", ")}
        </span>
      ) : null}
    </span>
  );
}
