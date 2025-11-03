"use client";

import { Suspense } from "react";
import Navbar from "@/app/_components/layout/Navbar";
import SearchPage from "@/app/_components/pages/SearchPage";
import { useAuth } from "@/app/_hooks/useAuth";

export default function Search() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="relative w-full overflow-x-hidden">
        <Suspense fallback={null}>
          <Navbar />
        </Suspense>
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
      <Suspense fallback={null}>
        <Navbar />
      </Suspense>
      {isAuthenticated ? <SearchPage /> : (
        <div className="flex items-center justify-center min-h-screen bg-background-logged-in">
          <p className="text-white text-xl">Please log in to search</p>
        </div>
      )}
    </div>
  );
}
