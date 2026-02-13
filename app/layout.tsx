import { ThemeProvider } from "@/app/_components/common/providers/ThemeProvider";
import { StoreProvider } from "@/app/_providers/StoreProvider";
import { CountryProvider } from "@/app/_components/common/providers/CountryProvider";
import { ToastProvider } from "@/app/_components/common/Toast";
import { EnvConfig } from "@/app/_components/common/EnvConfig";

import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${azeretMono.variable} font-mono antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <StoreProvider>
            <ToastProvider>
              <CountryProvider />
              <EnvConfig />
              {children}
            </ToastProvider>
          </StoreProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
