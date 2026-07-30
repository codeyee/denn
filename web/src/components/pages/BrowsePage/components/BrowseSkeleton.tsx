import { PlaceholderCard } from "@/components/common/cards/PlaceholderCard";

export function BrowseSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6" aria-label="Loading browse results">
      {Array.from({ length: 12 }, (_, index) => (
        <PlaceholderCard key={index} index={index} />
      ))}
    </div>
  );
}
