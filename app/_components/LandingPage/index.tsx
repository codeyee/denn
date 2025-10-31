"use client";

import HeroSection from "./HeroSection";
import ContentTypesSection from "./ContentTypesSection";
import FeaturesSection from "./FeaturesSection";
import StatsSection from "./StatsSection";
import CallToActionSection from "./CallToActionSection";
import Footer from "./Footer";

export default function LandingPage() {
  return (
    <>
      {/* Snap-scroll container */}
      <div className="snap-y snap-mandatory h-screen overflow-y-scroll overflow-x-hidden scroll-smooth">
        {/* Hero Screen - First Screen */}
        <HeroSection />

        {/* Features Screen - Second Screen */}
        <div className="snap-start snap-always relative min-h-screen w-full bg-[#12040fff]">
          {/* Fade-in gradient at top of features screen - creates seamless blend */}
          <div
            className="absolute top-0 left-0 right-0 h-80 pointer-events-none z-10"
            style={{
              background: `linear-gradient(to bottom, rgba(18, 4, 15, 0) 0%, rgba(18, 4, 15, 0.2) 25%, rgba(18, 4, 15, 0.6) 50%, rgba(18, 4, 15, 0.9) 75%, #12040fff 100%)`,
            }}
          />

          <div className="relative min-h-screen w-full pt-40 pb-20 z-20">
            <ContentTypesSection />
            <FeaturesSection />
            <StatsSection />
            <CallToActionSection />
            <Footer />
          </div>
        </div>
      </div>
    </>
  );
}

