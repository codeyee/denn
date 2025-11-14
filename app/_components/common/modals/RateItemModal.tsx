"use client";

import { useState } from "react";
import Modal from "@/app/_components/common/modals/Modal";
import { Button } from "@/app/_components/lib/button";
import { Star } from "lucide-react";

interface RateItemModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onRate: (rating: number) => Promise<void>;
  itemTitle: string;
  isLoading?: boolean;
}

export default function RateItemModal({
  isOpen,
  onOpenChange,
  onRate,
  itemTitle,
  isLoading = false,
}: RateItemModalProps) {
  const [selectedRating, setSelectedRating] = useState<number>(0);
  const [hoveredRating, setHoveredRating] = useState<number>(0);

  const handleSubmit = async () => {
    if (selectedRating > 0) {
      await onRate(selectedRating);
      setSelectedRating(0);
      setHoveredRating(0);
      onOpenChange(false);
    }
  };

  const handleSkip = () => {
    setSelectedRating(0);
    setHoveredRating(0);
    onOpenChange(false);
  };

  const renderStars = () => {
    const stars = [];
    for (let i = 1; i <= 10; i++) {
      const isFilled = i <= (hoveredRating || selectedRating);
      stars.push(
        <button
          key={i}
          type="button"
          onClick={() => setSelectedRating(i)}
          onMouseEnter={() => setHoveredRating(i)}
          onMouseLeave={() => setHoveredRating(0)}
          disabled={isLoading}
          className="cursor-pointer transition-transform hover:scale-110 disabled:cursor-not-allowed disabled:opacity-50"
          aria-label={`Rate ${i} out of 10`}
        >
          <Star
            className={`w-8 h-8 ${
              isFilled
                ? "fill-yellow-400 text-yellow-400"
                : "fill-none text-gray-400"
            }`}
          />
        </button>
      );
    }
    return stars;
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
          <div className="flex justify-center gap-1">
            {renderStars()}
          </div>

          {selectedRating > 0 && (
            <p className="text-white text-sm">
              {selectedRating} / 10
            </p>
          )}
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
