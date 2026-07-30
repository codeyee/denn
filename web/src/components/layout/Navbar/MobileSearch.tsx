import { useEffect, useRef, useState, type FormEvent } from "react";
import { useLocation, useNavigate } from "@tanstack/react-router";
import { Search, X } from "lucide-react";

import { Button } from "@/components/common/ui/Button";
import { SearchInput } from "@/components/common/ui/SearchInput";

interface MobileSearchProps {
  value: string;
  onChange: (value: string) => void;
}

export function MobileSearch({ value, onChange }: MobileSearchProps) {
  const navigate = useNavigate();
  const pathname = useLocation({ select: (location) => location.pathname });
  const inputRef = useRef<HTMLInputElement>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (isOpen) requestAnimationFrame(() => inputRef.current?.focus());
  }, [isOpen]);

  useEffect(() => {
    if (pathname === "/search") {
      setIsOpen(false);
    }
  }, [pathname]);

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
          <SearchInput
            id="mobile-navbar-search-input"
            inputRef={inputRef}
            value={value}
            onChange={onChange}
            onClear={() => onChange("")}
            label="Search movies, TV shows, games, albums, and books"
            placeholder="Search Denn"
            containerClassName="min-w-0 flex-1"
            inputClassName="rounded-md border-white/20 bg-transparent py-2 pl-11 placeholder:text-white/55"
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
