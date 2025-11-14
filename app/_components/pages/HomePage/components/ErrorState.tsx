interface ErrorStateProps {
  suggestionsError: unknown;
  listsError: unknown;
}

function formatError(error: unknown): string {
  if (typeof error === "string") {
    return error;
  }

  if (error && typeof error === "object" && "message" in error) {
    return String(error.message);
  }

  return "Unknown error";
}

export function ErrorState({ suggestionsError, listsError }: ErrorStateProps) {
  return (
    <div className="relative w-full min-h-screen bg-background-logged-in">
      <div className="container mx-auto px-4 mt-8 py-20">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <p className="text-red-400 text-xl mb-4">Error loading data</p>
            {suggestionsError && (
              <p className="text-gray-400 mb-2">
                Content: {formatError(suggestionsError)}
              </p>
            )}
            {listsError && (
              <p className="text-gray-400 mb-2">
                Lists: {formatError(listsError)}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
