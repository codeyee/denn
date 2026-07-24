import "@tanstack/react-start";
import { createFileRoute } from "@tanstack/react-router";

import { jsonResponse } from "@/server/auth-routes";
import { getOrCreateCsrfToken } from "@/server/auth-cookies";

export const Route = createFileRoute("/api/auth/csrf")({
  server: {
    handlers: {
      GET: () =>
        jsonResponse({ csrfToken: getOrCreateCsrfToken() }, 200),
    },
  },
});
