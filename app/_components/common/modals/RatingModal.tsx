"use client";

import { useEffect } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Modal } from "@/app/_components/common/modals/Modal";
import { Button } from "@/app/_components/common/Button";
import { StarRating } from "@/app/_components/common/ui/StarRating";
import { ContentType, Rating, RatingCreate, SourceApi } from "@/lib/api/types";

// Define validation schema
const ratingSchema = z.object({
  score: z
    .number()
    .min(0.5, "Rating must be at least 0.5")
    .max(10, "Rating must be at most 10"),
  comment: z
    .string()
    .max(1000, "Comment must be less than 1000 characters")
    .optional()
    .nullable(),
});

type RatingFormData = z.infer<typeof ratingSchema>;

interface RatingModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmitRating: (data: RatingCreate) => Promise<void>;
  existingRating?: Rating | null;
  isLoading?: boolean;
}

export function RatingModal({
  isOpen,
  onOpenChange,
  onSubmitRating,
  existingRating,
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
    },
  });

  const score = useWatch({ control, name: "score" }) ?? 0;

  // Reset form when modal opens/closes or existingRating changes
  useEffect(() => {
    if (isOpen && existingRating) {
      reset({
        score: parseFloat(existingRating.score),
        comment: existingRating.comment || "",
      });
    } else if (isOpen && !existingRating) {
      reset({
        score: 0.0,
        comment: "",
      });
    }
  }, [isOpen, existingRating, reset]);

  const onSubmit = async (data: RatingFormData) => {
    try {
      await onSubmitRating({
        score: data.score.toString(),
        comment: data.comment || null,
        source_api: existingRating?.content_item.source_api as SourceApi,
        external_id: existingRating?.content_item.external_id as string,
        content_type: existingRating?.content_item.content_type as ContentType,
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
              ? "Update your rating and comment"
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
              Comment (Optional)
            </label>
            <textarea
              id="rating-comment"
              placeholder="Share your thoughts..."
              disabled={isLoading}
              className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary font-sans resize-none disabled:opacity-50 disabled:cursor-not-allowed bg-background"
              rows={4}
              {...register("comment")}
            />
            {errors.comment && (
              <p className="text-red-500 text-sm mt-1">
                {errors.comment.message}
              </p>
            )}
          </div>
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

