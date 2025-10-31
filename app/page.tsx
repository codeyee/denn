"use client";

import TopMenu from "@/app/_components/TopMenu";
import LandingPage from "@/app/_components/LandingPage";

export default function Home() {
  return (
    <div className="relative w-full overflow-x-hidden">
      <TopMenu />
      <LandingPage />
    </div>
  );
}
