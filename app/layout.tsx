import { ThemeProvider } from "@/app/_components/common/providers/ThemeProvider";
import { StoreProvider } from "@/app/_providers/StoreProvider";
import { QueryProvider } from "@/app/_providers/QueryProvider";
import { CountryProvider } from "@/app/_components/common/providers/CountryProvider";
import { ToastProvider } from "@/app/_components/common/Toast";
import { EnvConfig } from "@/app/_components/common/EnvConfig";
import { WebVitalsReporter } from "@/app/_components/common/WebVitalsReporter";
import { AuthSessionBootstrap } from "@/app/_components/routes/AuthSessionBootstrap";
import { resolveSession, type SessionSnapshot } from "@/lib/auth/session-server";

import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";

const EMPTY_SESSION: SessionSnapshot = {
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  needsCookieSync: false,
};

const azeretMono = localFont({
  src: [
    {
      path: "../public/fonts/azeret_mono.ttf",
      style: "normal",
    },
    {
      path: "../public/fonts/azeret_mono_italic.ttf",
      style: "italic",
    },
  ],
  variable: "--font-azeret-mono",
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#0d030b",
};

export const metadata: Metadata = {
  title: "Denn",
  description: "Denn",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Denn",
  },
  icons: {
    icon: "/icon.png",
    apple: "/apple-touch-icon.png",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Resolve the session once per request so every route (not just `/` and
  // `/search`) has its non-HttpOnly auth cookies copied into the Zustand
  // store on hard refresh. Without this, deep-linked / refreshed protected
  // routes (e.g. /content/[id]) hydrate with `accessToken === null`, hit a
  // 401 on their first fetch, fail the refresh path with "No refresh token
  // available", and bounce the user back to /login.
  let session: SessionSnapshot = EMPTY_SESSION;
  try {
    session = await resolveSession();
  } catch (err) {
    // Backend down or unreachable: render the shell as a logged-out user
    // instead of crashing the entire app at the layout boundary.
    console.error("RootLayout: failed to resolve session", err);
  }

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${azeretMono.variable} font-mono antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <StoreProvider>
            <QueryProvider>
              <AuthSessionBootstrap session={session} />
              <ToastProvider>
                <CountryProvider />
                <EnvConfig />
                <WebVitalsReporter />
                {children}
              </ToastProvider>
            </QueryProvider>
          </StoreProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
