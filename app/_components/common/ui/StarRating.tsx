"use client";

import { useState } from "react";
import { Star } from "lucide-react";

interface StarRatingProps {
  value: number;
  onChange?: (value: number) => void;
  maxStars?: number;
  readonly?: boolean;
  size?: number;
}

export default function StarRating({
  value,
  onChange,
  maxStars = 5,
  readonly = false,
  size = 24,
}: StarRatingProps) {
  const [hoveredValue, setHoveredValue] = useState<number | null>(null);

  const displayValue = hoveredValue !== null ? hoveredValue : value;

  const handleStarClick = (starIndex: number, isHalf: boolean) => {
    if (readonly || !onChange) return;
    const newValue = isHalf ? starIndex + 0.5 : starIndex + 1;
    onChange(Math.min(Math.max(newValue, 0.5), maxStars));
  };

  const getStarState = (starIndex: number) => {
    const starValue = displayValue - starIndex;

    if (starValue >= 1) {
      return "full";
    } else if (starValue >= 0.5) {
      return "half";
    }
    return "empty";
  };

  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: maxStars }).map((_, index) => {
        const starState = getStarState(index);
        const isFull = starState === "full";
        const isHalf = starState === "half";

        return (
          <div
            key={index}
            className="relative inline-block"
            style={{ width: size, height: size }}
            onMouseLeave={() => {
              if (!readonly) {
                setHoveredValue(null);
              }
            }}
          >
            {/* Background star (always empty) */}
            <Star
              className="fill-transparent text-gray-400 pointer-events-none"
              size={size}
            />

            {/* Filled star (full or half) */}
            {isFull || isHalf ? (
              <div
                className="absolute inset-0 pointer-events-none overflow-hidden"
                style={isHalf ? { width: "50%" } : {}}
              >
                <Star
                  className="fill-yellow-400 text-yellow-400"
                  size={size}
                />
              </div>
            ) : null}

            {/* Interactive areas */}
            {!readonly && (
              <>
                {/* Left half for half-star clicks */}
                <div
                  className="absolute inset-0 cursor-pointer"
                  style={{ width: "50%" }}
                  onClick={() => handleStarClick(index, true)}
                  onMouseEnter={() => setHoveredValue(index + 0.5)}
                />
                {/* Right half for full-star clicks */}
                <div
                  className="absolute inset-0 cursor-pointer"
                  style={{ left: "50%", width: "50%" }}
                  onClick={() => handleStarClick(index, false)}
                  onMouseEnter={() => setHoveredValue(index + 1)}
                />
              </>
            )}
          </div>
        );
      })}
      {!readonly && (
        <span className="ml-2 text-white/60 font-sans text-md">
          {Number.isInteger(displayValue) ? displayValue.toString() : displayValue.toFixed(1)} / {maxStars}
        </span>
      )}
    </div>
  );
}

