import { createFileRoute } from "@tanstack/react-router";

import { BrowseHubPage } from "@/components/pages/BrowseHubPage";

export const Route = createFileRoute("/browse/")({
  head: () => ({
    meta: [
      { title: "Browse the catalog | Denn" },
      {
        name: "description",
        content: "Explore Denn's public catalog by movies, TV shows, games, music, and books.",
      },
    ],
    links: [{ rel: "canonical", href: "/browse" }],
  }),
  component: BrowseHubPage,
});
