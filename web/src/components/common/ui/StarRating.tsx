
import { Star } from "lucide-react";

interface StarRatingProps {
  value: number;
  onChange?: (value: number) => void;
  maxStars?: number;
  readonly?: boolean;
  size?: number;
}

export function StarRating({
  value,
  onChange,
  maxStars = 5,
  readonly = false,
  size = 24,
}: StarRatingProps) {
  const getStarState = (starIndex: number) => {
    const starValue = value - starIndex;

    if (starValue >= 1) {
      return "full";
    } else if (starValue >= 0.5) {
      return "half";
    }
    return "empty";
  };

  return (
    <div className="flex items-center gap-2">
      <div className="relative flex min-h-11 items-center gap-1 rounded-md focus-within:ring-4 focus-within:ring-white/70">
        {Array.from({ length: maxStars }).map((_, index) => {
          const starState = getStarState(index);
          const isFull = starState === "full";
          const isHalf = starState === "half";

          return (
            <div
              key={index}
              className="relative inline-block"
              style={{ width: size, height: size }}
            >
              <Star
                aria-hidden="true"
                className="pointer-events-none fill-transparent text-gray-400"
                size={size}
              />
              {isFull || isHalf ? (
                <div
                  className="pointer-events-none absolute inset-0 overflow-hidden"
                  style={isHalf ? { width: "50%" } : undefined}
                >
                  <Star
                    aria-hidden="true"
                    className="fill-yellow-400 text-yellow-400"
                    size={size}
                  />
                </div>
              ) : null}
            </div>
          );
        })}
        {!readonly && onChange ? (
          <input
            type="range"
            aria-label="Rating"
            aria-valuetext={`${value} out of ${maxStars}`}
            min={0.5}
            max={maxStars}
            step={0.5}
            value={value}
            onChange={(event) => onChange(Number(event.target.value))}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          />
        ) : null}
      </div>
      {!readonly && (
        <span className="ml-2 text-white/60 font-sans text-md">
          {Number.isInteger(value) ? value.toString() : value.toFixed(1)} / {maxStars}
        </span>
      )}
    </div>
  );
}
