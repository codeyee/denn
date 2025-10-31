"use client";

import TopMenu from "@/app/_components/TopMenu";
import LandingPage from "@/app/_components/LandingPage";
import HomePage from "@/app/_components/HomePage";
import { useAuth } from "@/app/_hooks/useAuth";

export default function Home() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="relative w-full overflow-x-hidden">
        <TopMenu />
        <div className="flex items-center justify-center min-h-screen bg-[#12040fff]">
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
