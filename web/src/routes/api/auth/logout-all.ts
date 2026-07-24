import "@tanstack/react-start";
import { createFileRoute } from "@tanstack/react-router";

import {
  csrfFailure,
  destroyAuthenticatedSession,
} from "@/server/auth-routes";
import { validateCsrfRequest } from "@/server/csrf";

export const Route = createFileRoute("/api/auth/logout-all")({
  server: {
    handlers: {
      POST: ({ request }) => {
        if (!validateCsrfRequest(request)) return csrfFailure();
        return destroyAuthenticatedSession(true);
      },
    },
  },
});
