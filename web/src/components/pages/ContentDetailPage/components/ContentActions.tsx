import { ListPlus, Star } from "lucide-react";

import { Button } from "@/components/common/ui/Button";

interface ContentActionsProps {
  isAuthenticated?: boolean;
  hasUserRating?: boolean;
  onAddToList?: () => void;
  onRateContent?: () => void;
  align?: "center" | "start";
}

export function ContentActions({
  isAuthenticated,
  hasUserRating,
  onAddToList,
  onRateContent,
  align = "start",
}: ContentActionsProps) {
  if (!onAddToList && !onRateContent) return null;

  return (
    <div className={align === "center" ? "text-center" : undefined}>
      <div
        className={`mt-4 flex flex-wrap gap-3 md:mt-6 ${
          align === "center" ? "justify-center" : ""
        }`}
      >
        {onAddToList && (
          <Button
            onClick={onAddToList}
            className="flex cursor-pointer items-center gap-2 bg-white font-semibold text-black hover:bg-white/90"
            size="lg"
          >
            <ListPlus className="h-5 w-5" />
            Add to List
          </Button>
        )}
        {onRateContent && (
          <Button
            onClick={onRateContent}
            className={`flex cursor-pointer items-center gap-2 font-semibold ${
              hasUserRating ? "" : "bg-white text-black hover:bg-white/90"
            }`}
            size="lg"
            variant={hasUserRating ? "outline" : "default"}
          >
            <Star className="h-5 w-5" />
            {hasUserRating ? "Edit Rating" : "Rate This"}
          </Button>
        )}
      </div>
      {!isAuthenticated && (
        <p className="mt-3 max-w-xl text-sm text-white/80 font-sans">
          Explore freely. Sign in only when you want to save, rate, or
          review something.
        </p>
      )}
    </div>
  );
}
