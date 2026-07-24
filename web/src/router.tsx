import "@tanstack/react-start";
import { createRouter as createTanStackRouter } from "@tanstack/react-router";
import { QueryClient } from "@tanstack/react-query";

import { routeTree } from "./routeTree.gen";
import { buildQueryClient } from "@/providers/QueryProvider";
import type { SessionSnapshot } from "@/server/session";

export interface RouterContext {
  queryClient: QueryClient;
  session: SessionSnapshot;
  country: string | null;
}

export function getRouter() {
  const queryClient = buildQueryClient();

  return createTanStackRouter({
    routeTree,
    defaultPreload: "intent",
    defaultPreloadStaleTime: 0,
    defaultPendingMs: 0,
    defaultPendingMinMs: 150,
    scrollRestoration: true,
    context: {
      queryClient,
      session: {
        user: null,
        accessToken: null,
        refreshToken: null,
        isAuthenticated: false,
        needsCookieSync: false,
        resolution: "anonymous",
      },
      country: null,
    } satisfies RouterContext,
  });
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
