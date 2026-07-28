interface EmptyStateProps {
  message?: string;
  type?: "initial" | "no-results" | "no-suggestions";
  query?: string;
  compact?: boolean;
}

export function EmptyState({ message, type = "no-suggestions", query, compact = false }: EmptyStateProps) {
  const getMessage = (): string => {
    if (message) return message;

    const defaultMessages = {
      "initial": "Start typing to search for content",
      "no-results": query ? `No results found for "${query}"` : "No results found",
      "no-suggestions": "No suggestions available at the moment",
    };

    return defaultMessages[type];
  };

  return (
    <div className={`flex items-center justify-center ${compact ? "min-h-24" : "min-h-[400px]"}`}>
      <p className="text-gray-400 text-lg">
        {getMessage()}
      </p>
    </div>
  );
}
