import { Search, X } from "lucide-react";
import { Button } from "@/components/common/ui/Button";

export interface ListNavigationSearchResult {
  id: number;
  title: string;
  subtitle: string;
  listOrder: number;
  pageIndex?: number;
}

interface ListNavigationSearchProps {
  query: string;
  results: ListNavigationSearchResult[];
  isLoading: boolean;
  disabled: boolean;
  canSearchAll: boolean;
  hasSearchedAll: boolean;
  onQueryChange: (value: string) => void;
  onClear: () => void;
  onSelectResult: (result: ListNavigationSearchResult) => void;
  onSearchAll: () => void;
}

export function ListNavigationSearch({
  query,
  results,
  isLoading,
  disabled,
  canSearchAll,
  hasSearchedAll,
  onQueryChange,
  onClear,
  onSelectResult,
  onSearchAll,
}: ListNavigationSearchProps) {
  const trimmedQuery = query.trim();
  const showResults = trimmedQuery.length > 0;

  return (
    <div className="relative mb-6">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/50 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Find an item in this list"
          disabled={disabled}
          className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-11 pr-12 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-white/30 disabled:cursor-not-allowed disabled:opacity-50"
        />
        {trimmedQuery ? (
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            onClick={onClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-white/60 hover:text-white"
            aria-label="Clear list search"
          >
            <X className="w-4 h-4" />
          </Button>
        ) : null}
      </div>

      {showResults ? (
        <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-xl border border-white/10 bg-background-logged-in shadow-2xl">
          {isLoading ? (
            <div className="px-4 py-3 text-sm text-white/60">Loading items…</div>
          ) : results.length > 0 ? (
            <div className="max-h-80 overflow-y-auto">
              {results.map((result) => (
                <button
                  key={result.id}
                  type="button"
                  onClick={() => onSelectResult(result)}
                  className="flex w-full items-start justify-between gap-3 border-b border-white/5 px-4 py-3 text-left transition-colors hover:bg-white/5"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-white">
                      {result.title}
                    </div>
                    {result.subtitle ? (
                      <div className="truncate text-xs text-white/50">
                        {result.subtitle}
                      </div>
                    ) : null}
                  </div>
                  <div className="shrink-0 text-xs font-mono text-white/40">
                    #{result.listOrder}
                  </div>
                </button>
              ))}
              {hasSearchedAll ? (
                <div className="px-4 py-2 text-xs text-white/40 border-t border-white/5">
                  Showing results from all items
                </div>
              ) : null}
            </div>
          ) : (
            <div className="px-4 py-3 space-y-2">
              <div className="text-sm text-white/60">
                No matches on this page for &quot;{trimmedQuery}&quot;
              </div>
              {canSearchAll ? (
                <button
                  type="button"
                  onClick={onSearchAll}
                  className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
                >
                  Search all items
                </button>
              ) : hasSearchedAll ? (
                <div className="text-xs text-white/40">
                  No matches found across all items
                </div>
              ) : null}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
