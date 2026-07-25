import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { AuthShell } from "@/components/auth/AuthShell";
import { LoginForm } from "@/components/forms/LoginForm";
import { normalizeInternalRedirectTarget } from "@/lib/auth/redirect";
import { redirectAuthenticatedSession } from "@/lib/auth/protected-route";

const loginSearchSchema = z.object({
  next: z.string().optional(),
});

export const Route = createFileRoute("/login")({
  validateSearch: loginSearchSchema,
  beforeLoad: ({ context }) => {
    redirectAuthenticatedSession(context.session);
  },
  head: () => ({
    meta: [
      { title: "Sign in | Denn" },
      {
        name: "description",
        content: "Sign in to continue tracking movies, TV, games, books, and music on Denn.",
      },
    ],
    links: [{ rel: "canonical", href: "/login" }],
  }),
  component: LoginRoute,
});

function LoginRoute() {
  const search = Route.useSearch();
  const next = normalizeInternalRedirectTarget(search.next);

  return (
    <AuthShell mode="login">
      <LoginForm next={next} />
    </AuthShell>
  );
}
