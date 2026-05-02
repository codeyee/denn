
import { HeroSection } from "./sections/HeroSection";
import { TypesSection } from "./sections/TypesSection";
import { FeaturesSection } from "./sections/FeaturesSection";
import { Footer } from "../../layout/Footer";

export function LandingPage() {
  return (
    <>
      {/* Snap-scroll container */}
      <div className="snap-y snap-mandatory h-screen overflow-y-scroll overflow-x-hidden scroll-smooth relative" style={{ scrollbarGutter: 'stable', zIndex: 1 }}>
        {/* Hero Screen - First Screen */}
        <HeroSection />

        {/* Features Screen - Second Screen */}
        <div className="snap-start snap-always relative min-h-screen w-full overflow-hidden" style={{ backgroundColor: 'var(--color-hero-gradient)' }}>
          {/* Fade-in gradient at top of features screen - creates seamless blend */}
          <div
            className="absolute top-0 left-0 right-0 h-80 pointer-events-none z-10"
            style={{
              background: `linear-gradient(to bottom, var(--color-hero-gradient-00) 0%, var(--color-hero-gradient-20) 25%, var(--color-hero-gradient-60) 50%, var(--color-hero-gradient-90) 75%, var(--color-hero-gradient) 100%)`,
            }}
          />

          <div className="relative min-h-screen w-full pt-30 md:pt-40 pb-20 z-20">
            <TypesSection />
            <FeaturesSection />
            <Footer />
          </div>
        </div>
      </div>

      {/* Bottom gradient */}
      <div className="pointer-events-none fixed left-0 right-0 bottom-0 h-16 bg-bottom-gradient z-10" />
    </>
  );
}

