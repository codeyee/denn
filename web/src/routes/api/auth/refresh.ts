import "@tanstack/react-start";
import { createFileRoute } from "@tanstack/react-router";

import { csrfFailure, jsonResponse } from "@/server/auth-routes";
import { refreshAuthCookies } from "@/server/auth-cookies";
import { validateCsrfRequest } from "@/server/csrf";

export const Route = createFileRoute("/api/auth/refresh")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!validateCsrfRequest(request)) return csrfFailure();
        const access = await refreshAuthCookies();
        return access
          ? jsonResponse({ detail: "Session refreshed." }, 200)
          : jsonResponse(
              { error: "SESSION_EXPIRED", detail: "Session expired." },
              401,
            );
      },
    },
  },
});
