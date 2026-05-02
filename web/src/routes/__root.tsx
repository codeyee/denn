import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRouteWithContext,
} from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";

import { ThemeProvider } from "@/components/common/providers/ThemeProvider";
import { StoreProvider } from "@/providers/StoreProvider";
import { QueryProvider } from "@/providers/QueryProvider";
import { CountryProvider } from "@/components/common/providers/CountryProvider";
import { ToastProvider } from "@/components/common/Toast";
import { WebVitalsReporter } from "@/components/common/WebVitalsReporter";
import { AuthSessionBootstrap } from "@/components/routes/AuthSessionBootstrap";

import type { RouterContext } from "@/router";
import { getSessionFn, getCountryFn } from "@/server/session";
import { getRuntimeEnvFn } from "@/server/runtime-env";

import appCss from "@/styles/globals.css?url";

export const Route = createRootRouteWithContext<RouterContext>()({
  beforeLoad: async () => {
    // Resolve once per request and merge into the router context. The
    // session and country flags need to be available to every route loader
    // (see lib/api/queries/server.ts which expects an authenticated
    // SessionSnapshot for protected prefetches).
    const [session, country, env] = await Promise.all([
      getSessionFn(),
      getCountryFn(),
      getRuntimeEnvFn(),
    ]);
    return { session, country, env };
  },
  head: ({ match }) => {
    const env =
      (match as unknown as { context?: { env?: unknown } }).context?.env;
    return {
      meta: [
        { charSet: "utf-8" },
        {
          name: "viewport",
          content:
            "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no",
        },
        { name: "theme-color", content: "#0d030b" },
        { title: "Denn" },
        { name: "description", content: "Denn" },
        { name: "apple-mobile-web-app-capable", content: "yes" },
        {
          name: "apple-mobile-web-app-status-bar-style",
          content: "black-translucent",
        },
        { name: "apple-mobile-web-app-title", content: "Denn" },
      ],
      links: [
        { rel: "stylesheet", href: appCss },
        { rel: "manifest", href: "/manifest.webmanifest" },
        { rel: "icon", href: "/icon.png" },
        { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
      ],
      scripts: env
        ? [
            {
              children: `window.__ENV__ = ${JSON.stringify(env)};`,
            },
          ]
        : [],
    };
  },
  component: RootComponent,
});

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body
        className="font-mono antialiased"
        style={{ fontFamily: "var(--font-azeret-mono)" }}
      >
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient, session } = Route.useRouteContext();

  return (
    <RootDocument>
      <ThemeProvider
        attribute="class"
        defaultTheme="dark"
        enableSystem
        disableTransitionOnChange
      >
        <StoreProvider>
          <QueryProvider client={queryClient}>
            <AuthSessionBootstrap session={session} />
            <ToastProvider>
              <CountryProvider />
              <WebVitalsReporter />
              <Outlet />
              {import.meta.env.DEV ? (
                <TanStackRouterDevtools position="bottom-right" />
              ) : null}
            </ToastProvider>
          </QueryProvider>
        </StoreProvider>
      </ThemeProvider>
    </RootDocument>
  );
}
