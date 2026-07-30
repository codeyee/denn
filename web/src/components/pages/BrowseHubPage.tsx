import { ArrowRight } from "lucide-react";
import { Link } from "@tanstack/react-router";

import { Footer } from "@/components/layout/Footer";
import { Navbar } from "@/components/layout/Navbar";
import {
  CONTENT_TYPE_DEFINITIONS,
  DISCOVERY_CONTENT_TYPES,
} from "@/lib/contentTypes";

export function BrowseHubPage() {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-background-logged-in">
      <Navbar />
      <main id="main-content" tabIndex={-1} className="px-4 pb-20 pt-28 md:px-8 lg:pt-36">
        <div className="mx-auto max-w-5xl">
          <p className="text-sm text-white/60">Public catalog</p>
          <h1 className="mt-2 text-wrap-balance font-mono text-3xl font-bold text-white md:text-4xl">
            Browse the catalog
          </h1>
          <p className="mt-3 max-w-2xl text-white/65">
            Choose a medium, explore what is popular or recent, and open a title in Denn.
          </p>

          <nav aria-label="Browse content families" className="mt-8 grid gap-3 sm:grid-cols-2">
            {DISCOVERY_CONTENT_TYPES.map((type) => {
              const definition = CONTENT_TYPE_DEFINITIONS[type];
              const Icon = definition.icon;
              return (
                <Link
                  key={type}
                  to="/browse/$type"
                  params={{ type: definition.slug }}
                  search={{ page: 1, sort: "popular" }}
                  className="group flex min-h-24 items-center justify-between rounded-xl border border-white/10 bg-white/[0.04] p-5 transition-colors hover:border-white/35 hover:bg-white/[0.08] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white motion-reduce:transition-none"
                >
                  <span className="flex items-center gap-4">
                    <Icon aria-hidden="true" className="size-7 text-white/80" />
                    <span>
                      <span className="block font-mono text-lg font-bold text-white">{definition.pluralLabel}</span>
                      <span className="mt-1 block text-sm text-white/55">Popular and recent</span>
                    </span>
                  </span>
                  <ArrowRight aria-hidden="true" className="size-5 text-white/55 transition-transform group-hover:translate-x-1 motion-reduce:transition-none" />
                </Link>
              );
            })}
          </nav>
        </div>
        <Footer />
      </main>
    </div>
  );
}
