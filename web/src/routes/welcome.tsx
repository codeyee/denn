import { createFileRoute } from "@tanstack/react-router";

import { Navbar } from "@/components/layout/Navbar";
import { LandingPage } from "@/components/pages/LandingPage";

export const Route = createFileRoute("/welcome")({
  head: () => ({
    meta: [
      { title: "Welcome to Denn" },
      {
        name: "description",
        content:
          "Discover how Denn brings movies, TV shows, games, books, and music together.",
      },
    ],
    links: [{ rel: "canonical", href: "/welcome" }],
  }),
  component: WelcomeRoute,
});

function WelcomeRoute() {
  return (
    <div className="relative w-full overflow-x-hidden">
      <Navbar />
      <LandingPage />
    </div>
  );
}
