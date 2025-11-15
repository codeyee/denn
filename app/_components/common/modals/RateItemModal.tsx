"use client";

import { useState } from "react";
import { Modal } from "@/app/_components/common/modals/Modal";
import { Button } from "@/app/_components/common/ui/Button";
import { StarRating } from "@/app/_components/common/ui/StarRating";

interface RateItemModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onRate: (rating: number) => Promise<void>;
  itemTitle: string;
  isLoading?: boolean;
}

export function RateItemModal({
  isOpen,
  onOpenChange,
  onRate,
  itemTitle,
  isLoading = false,
}: RateItemModalProps) {
  const [selectedRating, setSelectedRating] = useState<number>(0);

  const handleSubmit = async () => {
    if (selectedRating > 0) {
      await onRate(selectedRating);
      setSelectedRating(0);
      onOpenChange(false);
    }
  };

  const handleSkip = () => {
    setSelectedRating(0);
    onOpenChange(false);
  };

  const handleRatingChange = (value: number) => {
    if (!isLoading) {
      setSelectedRating(value);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={handleSkip}
      showCloseButton={!isLoading}
    >
      <div className="flex flex-col items-center text-center">
        <Modal.Header
          title="Rate this item"
          description={`How would you rate "${itemTitle}"?`}
        />

        <Modal.Content className="space-y-6 mt-4">
          <div className="flex justify-center">
            <StarRating
              value={selectedRating}
              onChange={handleRatingChange}
              maxStars={10}
              size={32}
              readonly={isLoading}
            />
          </div>
        </Modal.Content>

        <div className="flex justify-center gap-3 mt-6 w-full">
          <Button
            type="button"
            variant="outline"
            onClick={handleSkip}
            disabled={isLoading}
            className="flex-1 cursor-pointer"
          >
            Skip
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isLoading || selectedRating === 0}
            className="flex-1 cursor-pointer bg-yellow-600 hover:bg-yellow-700 text-white"
          >
            {isLoading ? "Rating..." : "Rate"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
