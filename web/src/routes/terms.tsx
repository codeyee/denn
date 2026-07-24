import { createFileRoute } from "@tanstack/react-router";

import { LegalPage } from "@/components/pages/LegalPage";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms | Denn" },
      { name: "description", content: "Terms for using Denn." },
    ],
    links: [{ rel: "canonical", href: "/terms" }],
  }),
  component: TermsRoute,
});

function TermsRoute() {
  return (
    <LegalPage
      title="Terms"
      intro="Use Denn responsibly and only for accounts and content you are authorized to manage."
      sections={[
        {
          heading: "Your account",
          content: (
            <p>
              You are responsible for the accuracy of your registration
              information and for protecting access to your account. Do not
              attempt to access another person&apos;s private lists or ratings.
            </p>
          ),
        },
        {
          heading: "Catalog metadata",
          content: (
            <p>
              Titles, artwork, and provider metadata may be incomplete,
              delayed, or unavailable. Provider attribution remains subject to
              each provider&apos;s terms and Denn does not claim ownership of
              third-party catalog data.
            </p>
          ),
        },
        {
          heading: "Availability",
          content: (
            <p>
              Denn is provided as an evolving service. Features may change and
              temporary interruptions can occur during provider or application
              maintenance.
            </p>
          ),
        },
        {
          heading: "Acceptable use",
          content: (
            <p>
              Do not abuse the service, bypass access controls, scrape it at
              disruptive volume, or upload content that violates applicable
              law or another person&apos;s rights.
            </p>
          ),
        },
      ]}
    />
  );
}
