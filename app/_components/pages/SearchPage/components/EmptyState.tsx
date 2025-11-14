interface EmptyStateProps {
  type: "initial" | "no-results";
  query?: string;
}

/**
 * Empty state component for search page
 * - "initial": Shown when user hasn't typed anything
 * - "no-results": Shown when search returns no results
 */
export function EmptyState({ type, query }: EmptyStateProps) {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <p className="text-gray-400 text-lg">
        {type === "initial" ? (
          "Start typing to search for content"
        ) : (
          <>No results found for &quot;{query}&quot;</>
        )}
      </p>
    </div>
  );
}
