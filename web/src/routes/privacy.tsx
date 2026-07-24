import { createFileRoute } from "@tanstack/react-router";

import { LegalPage } from "@/components/pages/LegalPage";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy | Denn" },
      {
        name: "description",
        content: "How Denn handles account, session, list, and provider data.",
      },
    ],
    links: [{ rel: "canonical", href: "/privacy" }],
  }),
  component: PrivacyRoute,
});

function PrivacyRoute() {
  return (
    <LegalPage
      title="Privacy"
      intro="Denn stores only the information needed to provide accounts, lists, ratings, and a secure session."
      sections={[
        {
          heading: "Account and activity data",
          content: (
            <>
              <p>
                Denn stores your username, email address, lists, list
                memberships, ratings, and the timestamps needed to operate
                those features.
              </p>
              <p>
                Passwords are handled by the authentication service and are not
                stored as readable text.
              </p>
            </>
          ),
        },
        {
          heading: "Sessions and security",
          content: (
            <p>
              Session cookies keep you signed in. They are scoped to the
              application and protected with browser cookie controls. Denn does
              not place provider credentials or its internal proxy key in the
              browser.
            </p>
          ),
        },
        {
          heading: "External metadata providers",
          content: (
            <p>
              Denn&apos;s proxy requests public catalog metadata from TMDB,
              IGDB, Spotify, and Open Library. These providers receive catalog
              queries from Denn&apos;s server, not your Denn password.
            </p>
          ),
        },
        {
          heading: "Logs and retention",
          content: (
            <p>
              Operational logs may contain request identifiers, routes, timing,
              and cache state. They are designed to exclude credentials, raw
              tokens, personal preference values, and request bodies.
            </p>
          ),
        },
      ]}
    />
  );
}
