"use client";

import TopMenu from "@/app/_components/TopMenu";
import LandingPage from "@/app/_components/pages/LandingPage";
import HomePage from "@/app/_components/pages/HomePage";
import { useAuth } from "@/app/_hooks/useAuth";

export default function Home() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="relative w-full overflow-x-hidden">
        <TopMenu />
        <div
          className="flex items-center justify-center min-h-screen"
          style={{ backgroundColor: "var(--color-hero-gradient)" }}
        >
          <p className="text-white">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full overflow-x-hidden">
      <TopMenu />
      {isAuthenticated ? <HomePage /> : <LandingPage />}
    </div>
  );
}
