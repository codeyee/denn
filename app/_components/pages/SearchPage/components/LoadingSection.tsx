import PlaceholderCard from "../../../cards/PlaceholderCard";
import Carousel from "../../../common/Carousel";

interface LoadingSectionProps {
  title: string;
  count?: number;
  itemsPerView?: number;
  targetCardWidth?: number;
}

const DEFAULT_PLACEHOLDER_COUNT = 6;
const DEFAULT_TARGET_WIDTH = 250;

/**
 * Loading placeholder carousel section
 * Displays animated placeholder cards while search is in progress
 */
export function LoadingSection({
  title,
  count = DEFAULT_PLACEHOLDER_COUNT,
  itemsPerView,
  targetCardWidth = DEFAULT_TARGET_WIDTH,
}: LoadingSectionProps) {
  return (
    <section className="mb-4 md:mb-8">
      <Carousel
        title={title}
        itemsPerView={itemsPerView}
        targetCardWidth={targetCardWidth}
        disableNavigation
      >
        {Array.from({ length: count }).map((_, index) => (
          <PlaceholderCard
            key={`${title.toLowerCase()}-placeholder-${index}`}
            index={index}
          />
        ))}
      </Carousel>
    </section>
  );
}
