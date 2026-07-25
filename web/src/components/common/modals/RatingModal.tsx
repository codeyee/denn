
import { useEffect } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Modal } from "@/components/common/modals/Modal";
import { Button } from "@/components/common/ui/Button";
import { StarRating } from "@/components/common/ui/StarRating";
import { ContentType, Rating, RatingCreate, SourceApi, ContentItem } from "@/lib/types";

// Define validation schema
const ratingSchema = z.object({
  score: z
    .number()
    .min(0.5, "Rating must be at least 0.5")
    .max(10, "Rating must be at most 10"),
  comment: z
    .string()
    .max(2000, "Review must be 2,000 characters or fewer")
    .optional()
    .nullable(),
  spoiler: z.boolean(),
});

type RatingFormData = z.infer<typeof ratingSchema>;

interface RatingModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmitRating: (data: RatingCreate) => Promise<void>;
  existingRating?: Rating | null;
  contentItem?: ContentItem | null;
  isLoading?: boolean;
}

export function RatingModal({
  isOpen,
  onOpenChange,
  onSubmitRating,
  existingRating,
  contentItem,
  isLoading,
}: RatingModalProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setError,
    setValue,
    control,
  } = useForm<RatingFormData>({
    resolver: zodResolver(ratingSchema),
    mode: "onTouched",
    defaultValues: {
      score: existingRating ? parseFloat(existingRating.score) : 5.0,
      comment: existingRating?.comment || "",
      spoiler: existingRating?.spoiler ?? false,
    },
  });

  const score = useWatch({ control, name: "score" }) ?? 0;

  // Reset form when modal opens/closes or existingRating changes
  useEffect(() => {
    if (isOpen && existingRating) {
      reset({
        score: parseFloat(existingRating.score),
        comment: existingRating.comment || "",
        spoiler: existingRating.spoiler,
      });
    } else if (isOpen && !existingRating) {
      reset({
        score: 5.0,
        comment: "",
        spoiler: false,
      });
    }
  }, [isOpen, existingRating, reset]);

  const onSubmit = async (data: RatingFormData) => {
    try {
      // Use contentItem if provided, otherwise fall back to existingRating.content_item
      const item = contentItem || existingRating?.content_item;
      if (!item) {
        throw new Error("No content item available for rating");
      }

      await onSubmitRating({
        score: data.score.toString(),
        comment: data.comment || null,
        spoiler: Boolean(data.comment?.trim()) && data.spoiler,
        source_api: item.source_api as SourceApi,
        external_id: item.external_id as string,
        content_type: item.content_type as ContentType,
      });

      // Reset form and close modal on success
      reset();
      onOpenChange(false);
    } catch (err) {
      setError("root", {
        message: err instanceof Error ? err.message : "Failed to save rating",
      });
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      reset();
      onOpenChange(false);
    }
  };

  const handleScoreChange = (newScore: number) => {
    setValue("score", newScore, { shouldValidate: true });
  };

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={handleClose}
      showCloseButton={!isLoading}
    >
      <form onSubmit={handleSubmit(onSubmit)}>
        <Modal.Header
          title={existingRating ? "Update Rating" : "Rate This Content"}
          description={
            existingRating
              ? "Update your rating and review"
              : "Share your thoughts on this content"
          }
        />

        <Modal.Content className="space-y-6 mt-4">
          {errors.root && (
            <div className="bg-red-500/10 border border-red-500/50 rounded-md p-3 mb-2">
              <p className="text-red-500 text-sm">{errors.root.message}</p>
            </div>
          )}

          <div className="space-y-2">
            <label className="block text-sm font-medium">
              Rating <span className="text-red-500">*</span>
            </label>
            <StarRating
              value={score}
              onChange={handleScoreChange}
              maxStars={10}
              size={28}
            />
            {errors.score && (
              <p className="text-red-500 text-sm mt-1">
                {errors.score.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label
              htmlFor="rating-comment"
              className="block text-sm font-medium"
            >
              Review (Optional)
            </label>
            <textarea
              id="rating-comment"
              placeholder="Share your thoughts..."
              disabled={isLoading}
              className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary font-sans resize-none disabled:opacity-50 disabled:cursor-not-allowed bg-background"
              rows={4}
              maxLength={2000}
              {...register("comment")}
            />
            {errors.comment && (
              <p className="text-red-500 text-sm mt-1">
                {errors.comment.message}
              </p>
            )}
          </div>

          <label className="flex min-h-11 items-center gap-3 rounded-md border border-white/15 px-3 text-sm">
            <input
              type="checkbox"
              className="size-5 accent-white"
              disabled={isLoading}
              {...register("spoiler")}
            />
            Hide this review behind a spoiler warning
          </label>
        </Modal.Content>

        <div className="flex justify-end gap-3 mt-6">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isLoading}
            className="cursor-pointer"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isLoading}
            className="cursor-pointer"
          >
            {isLoading
              ? existingRating
                ? "Updating..."
                : "Creating..."
              : existingRating
                ? "Update Rating"
                : "Submit Rating"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
