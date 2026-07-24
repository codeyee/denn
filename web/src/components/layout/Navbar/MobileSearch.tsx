import { useEffect, useRef, useState, type FormEvent } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Search, X } from "lucide-react";

import { Button } from "@/components/common/ui/Button";

interface MobileSearchProps {
  value: string;
  onChange: (value: string) => void;
}

export function MobileSearch({ value, onChange }: MobileSearchProps) {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (isOpen) requestAnimationFrame(() => inputRef.current?.focus());
  }, [isOpen]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const query = value.trim();
    void navigate({
      to: "/search",
      search: query ? { q: query } : {},
    });
    setIsOpen(false);
  };

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="lg:hidden"
        aria-label="Open search"
        aria-expanded={isOpen}
        aria-controls="mobile-navbar-search"
        onClick={() => setIsOpen((open) => !open)}
      >
        <Search aria-hidden="true" className="size-5" />
      </Button>

      {isOpen && (
        <form
          id="mobile-navbar-search"
          role="search"
          onSubmit={submit}
          className="absolute inset-x-4 top-full mt-1 flex items-center gap-2 rounded-xl bg-neutral-950 p-2 shadow-lg lg:hidden"
        >
          <label htmlFor="mobile-navbar-search-input" className="sr-only">
            Search movies, TV shows, games, albums, and books
          </label>
          <Search
            aria-hidden="true"
            className="ml-2 size-5 shrink-0 text-gray-300"
          />
          <input
            id="mobile-navbar-search-input"
            ref={inputRef}
            type="search"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder="Search Denn"
            className="min-h-11 min-w-0 flex-1 bg-transparent px-2 text-white placeholder:text-gray-300 focus:outline-none"
          />
          <Button type="submit" size="sm">
            Search
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Close search"
            onClick={() => setIsOpen(false)}
          >
            <X aria-hidden="true" />
          </Button>
        </form>
      )}
    </>
  );
}
