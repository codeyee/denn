import { Link } from "@tanstack/react-router";
import { CheckCircle2, Clock3, Globe2, Users } from "lucide-react";

import { ContentCard } from "@/components/common/cards/ContentCard";
import { Footer } from "@/components/layout/Footer";
import { Navbar } from "@/components/layout/Navbar";
import type { PublicListDetail } from "@/lib/types";
import { profileContentCardItem } from "@/components/pages/PublicProfilePage/utils";

export function PublicListPage({ list }: { list: PublicListDetail }) {
  return (
    <>
      <Navbar />
      <main
        id="main-content"
        tabIndex={-1}
        className="min-h-screen bg-background-logged-in px-4 pb-14 pt-28 sm:px-8"
      >
        <div className="mx-auto max-w-[1600px]">
          <header className="rounded-3xl border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(116,55,135,0.35),transparent_45%),rgba(255,255,255,0.04)] p-6 md:p-10">
            <div className="flex flex-wrap items-center gap-2 text-sm text-white/55">
              <Globe2 aria-hidden="true" className="h-4 w-4" />
              Public list
              <span aria-hidden="true">•</span>
              <Users aria-hidden="true" className="h-4 w-4" />
              {list.collaborators.length + 1} members
            </div>
            <h1 className="mt-3 text-3xl font-black md:text-5xl">{list.name}</h1>
            {list.description ? (
              <p className="mt-3 max-w-3xl text-white/65">{list.description}</p>
            ) : null}
            <p className="mt-5 text-sm text-white/55">
              Curated by{" "}
              <Link
                to="/user/$username"
                params={{ username: list.owner.username }}
                search={{ tab: "overview", page: 1 }}
                className="rounded-sm font-semibold text-white hover:underline focus-visible:ring-4 focus-visible:ring-white/70"
              >
                @{list.owner.username}
              </Link>
            </p>
          </header>

          <section className="py-10" aria-labelledby="public-list-items">
            <div className="mb-6 flex items-baseline gap-3">
              <h2 id="public-list-items" className="text-2xl font-bold">
                Items
              </h2>
              <span className="text-sm text-white/50">{list.item_count} total</span>
            </div>
            {list.items.length > 0 ? (
              <div className="grid grid-cols-2 gap-x-3 gap-y-7 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
                {list.items.map((item) => (
                  <ContentCard
                    key={item.id}
                    item={profileContentCardItem(item.content)}
                    showAddToList={false}
                    badgeSlot={
                      item.context_status === "COMPLETED" ? (
                        <span className="grid h-8 w-8 place-items-center rounded-full bg-emerald-500/90 text-black">
                          <CheckCircle2 aria-label="Completed" className="h-4 w-4" />
                        </span>
                      ) : (
                        <span className="grid h-8 w-8 place-items-center rounded-full bg-black/70 text-white/70">
                          <Clock3 aria-label="Pending" className="h-4 w-4" />
                        </span>
                      )
                    }
                  />
                ))}
              </div>
            ) : (
              <div className="grid min-h-64 place-items-center rounded-2xl border border-dashed border-white/15 text-white/50">
                This public list is empty.
              </div>
            )}
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
