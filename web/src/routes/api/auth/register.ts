import "@tanstack/react-start";
import { createFileRoute } from "@tanstack/react-router";

import {
  createAuthenticatedSession,
  csrfFailure,
} from "@/server/auth-routes";
import { validateCsrfRequest } from "@/server/csrf";

export const Route = createFileRoute("/api/auth/register")({
  server: {
    handlers: {
      POST: ({ request }) => {
        if (!validateCsrfRequest(request)) return csrfFailure();
        return createAuthenticatedSession(request, "register");
      },
    },
  },
});
