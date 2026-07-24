import "@tanstack/react-start";
import { createFileRoute } from "@tanstack/react-router";

import { csrfFailure, jsonResponse } from "@/server/auth-routes";
import { forwardCoreRequest } from "@/server/core-bff";
import { validateCsrfRequest } from "@/server/csrf";

async function handle(request: Request, params: unknown) {
  if (
    request.method !== "GET" &&
    request.method !== "HEAD" &&
    !validateCsrfRequest(request)
  ) {
    return csrfFailure();
  }

  const path = (params as { _splat?: string })._splat ?? "";
  try {
    return await forwardCoreRequest(request, path);
  } catch (error) {
    return jsonResponse(
      {
        error: "BFF_CORE_UNAVAILABLE",
        detail:
          error instanceof Error
            ? error.message
            : "Core service is unavailable.",
      },
      502,
    );
  }
}

export const Route = createFileRoute("/api/core/$")({
  server: {
    handlers: {
      GET: ({ request, params }) => handle(request, params),
      POST: ({ request, params }) => handle(request, params),
      PUT: ({ request, params }) => handle(request, params),
      PATCH: ({ request, params }) => handle(request, params),
      DELETE: ({ request, params }) => handle(request, params),
    },
  },
});
