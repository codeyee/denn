import Carousel from "./Carousel";
import PlaceholderCard from "../cards/PlaceholderCard";

interface LoadingCarouselProps {
  title: string;
  count?: number;
}

export function LoadingCarousel({ title, count = 6 }: LoadingCarouselProps) {
  return (
    <section className="mb-4 md:mb-8">
      <Carousel title={title} items={[]} isLoading>
        {Array.from({ length: count }).map((_, index) => (
          <PlaceholderCard key={`${title}-placeholder-${index}`} index={index} />
        ))}
      </Carousel>
    </section>
  );
}
