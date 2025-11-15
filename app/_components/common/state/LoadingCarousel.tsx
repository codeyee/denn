import { Carousel } from "../ui/Carousel";
import { PlaceholderCard } from "../cards/PlaceholderCard";

interface LoadingCarouselProps {
  title: string;
  count?: number;
}

export function LoadingCarousel({ title, count = 10 }: LoadingCarouselProps) {
  return (
    <section className="mb-4 md:mb-8">
      <Carousel
        title={title}
        disableNavigation
      >
        {Array.from({ length: count }).map((_, index) => (
          <PlaceholderCard key={`${title}-placeholder-${index}`} index={index} />
        ))}
      </Carousel>
    </section>
  );
}
