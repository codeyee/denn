import { createFileRoute } from "@tanstack/react-router";

import { LegalPage } from "@/components/pages/LegalPage";

const ISSUE_URL = "https://github.com/codeyee/denn/issues/new";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact | Denn" },
      {
        name: "description",
        content: "Report a Denn problem or request support.",
      },
    ],
    links: [{ rel: "canonical", href: "/contact" }],
  }),
  component: ContactRoute,
});

function ContactRoute() {
  return (
    <LegalPage
      title="Contact"
      intro="Denn uses its public issue tracker for support, bug reports, and feature requests."
      sections={[
        {
          heading: "Open a support issue",
          content: (
            <>
              <p>
                Describe what happened, what you expected, and the route where
                you saw the problem.
              </p>
              <a
                href={ISSUE_URL}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-11 items-center rounded-md bg-white px-4 py-2 font-semibold text-black hover:bg-white/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                Open the Denn issue tracker
              </a>
            </>
          ),
        },
        {
          heading: "Protect your account",
          content: (
            <p>
              Never include passwords, session cookies, tokens, or private list
              contents in a public report. Use a minimal reproduction and
              redact personal data from screenshots and logs.
            </p>
          ),
        },
      ]}
    />
  );
}
