import { Carousel } from "../ui/Carousel";
import { PlaceholderCard } from "../cards/PlaceholderCard";
import { CONTENT_TYPE_DEFINITIONS } from "@/lib/contentTypes";
import type { ContentType } from "@/lib/types";

interface LoadingCarouselProps {
  contentType: ContentType;
  count?: number;
}

export function LoadingCarousel({
  contentType,
  count = 10,
}: LoadingCarouselProps) {
  const definition = CONTENT_TYPE_DEFINITIONS[contentType];

  return (
    <Carousel
      title={definition.pluralLabel}
      titleIcon={definition.icon}
      disableNavigation
      className="mb-4 md:mb-8"
    >
      {Array.from({ length: count }).map((_, index) => (
        <PlaceholderCard
          key={`${definition.slug}-placeholder-${index}`}
          index={index}
        />
      ))}
    </Carousel>
  );
}
