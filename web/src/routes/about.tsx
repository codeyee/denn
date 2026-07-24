import { createFileRoute } from "@tanstack/react-router";

import { LegalPage } from "@/components/pages/LegalPage";

export const Route = createFileRoute("/about")({
  head: () => pageHead("About Denn", "How Denn helps people track stories across media.", "/about"),
  component: AboutRoute,
});

function AboutRoute() {
  return (
    <LegalPage
      title="About Denn"
      intro="Denn is a personal media tracker for movies, television, games, music, and books."
      sections={[
        {
          heading: "What Denn does",
          content: (
            <p>
              You can discover titles, organize personal or shared lists, mark
              progress, and add ratings without treating any one media provider
              as the source of truth for your account.
            </p>
          ),
        },
        {
          heading: "How metadata works",
          content: (
            <p>
              Public metadata comes from TMDB, IGDB, Spotify, and Open Library
              through Denn&apos;s server-side proxy. Denn normalizes that data
              before it reaches the application.
            </p>
          ),
        },
        {
          heading: "Project status",
          content: (
            <p>
              Denn is under active development. Product behavior, provider
              coverage, and these policies may evolve as the service matures.
            </p>
          ),
        },
      ]}
    />
  );
}

function pageHead(title: string, description: string, canonical: string) {
  return {
    meta: [
      { title: `${title} | Denn` },
      { name: "description", content: description },
    ],
    links: [{ rel: "canonical", href: canonical }],
  };
}
