import { Search, X } from "lucide-react";
import type { RefObject } from "react";

import { SEARCH_QUERY_MAX_LENGTH } from "@/lib/search";
import { cn } from "@/lib/utils/tailwindUtils";

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  id: string;
  label: string;
  placeholder: string;
  inputRef?: RefObject<HTMLInputElement | null>;
  maxLength?: number;
  containerClassName?: string;
  inputClassName?: string;
  labelClassName?: string;
  clearLabel?: string;
  onClear?: () => void;
}

export function SearchInput({
  value,
  onChange,
  id,
  label,
  placeholder,
  inputRef,
  maxLength = SEARCH_QUERY_MAX_LENGTH,
  containerClassName,
  inputClassName,
  labelClassName,
  clearLabel = "Clear search",
  onClear,
}: SearchInputProps) {
  return (
    <div className={cn("relative", containerClassName)}>
      <label htmlFor={id} className={cn("sr-only", labelClassName)}>
        {label}
      </label>
      <div className="relative">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute left-4 top-1/2 z-10 size-5 -translate-y-1/2 text-white/70"
        />
        <input
          id={id}
          ref={inputRef}
          type="search"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          maxLength={maxLength}
          className={cn(
            "min-h-11 w-full rounded-xl border border-white/20 bg-white/10 py-2 pl-12 pr-12 text-white outline-none backdrop-blur-lg transition-colors placeholder:text-white/55 focus:border-white/50 focus:ring-2 focus:ring-white/60 motion-reduce:transition-none",
            inputClassName,
          )}
        />
        {value && onClear ? (
          <button
            type="button"
            aria-label={clearLabel}
            className="absolute right-2 top-1/2 z-10 inline-flex size-9 -translate-y-1/2 items-center justify-center rounded-md text-white/70 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-white motion-reduce:transition-none"
            onClick={onClear}
          >
            <X aria-hidden="true" className="size-4" />
          </button>
        ) : null}
      </div>
    </div>
  );
}
