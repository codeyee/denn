import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { RegisterForm } from "@/components/forms/RegisterForm";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { normalizeInternalRedirectTarget } from "@/lib/auth/redirect";

const registerSearchSchema = z.object({
  next: z.string().optional(),
});

export const Route = createFileRoute("/register")({
  validateSearch: registerSearchSchema,
  component: RegisterRoute,
});

function RegisterRoute() {
  const search = Route.useSearch();
  const next = normalizeInternalRedirectTarget(search.next);

  return (
    <div className="min-h-screen flex flex-col bg-background-logged-in">
      <Navbar />
      <main id="main-content" tabIndex={-1} className="flex flex-1 items-center justify-center px-4 pt-20">
        <RegisterForm next={next} />
      </main>
      <Footer />

      <div className="pointer-events-none fixed left-0 right-0 bottom-0 h-16 bg-bottom-gradient z-10" />
    </div>
  );
}
