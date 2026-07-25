import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { AuthShell } from "@/components/auth/AuthShell";
import { RegisterForm } from "@/components/forms/RegisterForm";
import { normalizeInternalRedirectTarget } from "@/lib/auth/redirect";
import { redirectAuthenticatedSession } from "@/lib/auth/protected-route";

const registerSearchSchema = z.object({
  next: z.string().optional(),
});

export const Route = createFileRoute("/register")({
  validateSearch: registerSearchSchema,
  beforeLoad: ({ context }) => {
    redirectAuthenticatedSession(context.session);
  },
  head: () => ({
    meta: [
      { title: "Create an account | Denn" },
      {
        name: "description",
        content: "Create a Denn account and organize everything you watch, play, read, and hear.",
      },
    ],
    links: [{ rel: "canonical", href: "/register" }],
  }),
  component: RegisterRoute,
});

function RegisterRoute() {
  const search = Route.useSearch();
  const next = normalizeInternalRedirectTarget(search.next);

  return (
    <AuthShell mode="register">
      <RegisterForm next={next} />
    </AuthShell>
  );
}
