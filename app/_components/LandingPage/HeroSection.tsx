"use client";

import BlurText from "@/app/_components/ui/TextAnimations/BlurText";
import GradientText from "@/app/_components/ui/TextAnimations/GradientText";
import { Badge } from "@/app/_components/ui/badge";
import { Button } from "@/app/_components/ui/button";
import DomeGalleryBackground from "@/app/_components/Backgrounds/DomeGallery";
import { useState } from "react";
import {
  Film,
  Tv,
  Gamepad2,
  Book,
  Music,
  ArrowRight,
  ChevronDown,
} from "lucide-react";
import Link from "next/link";

export default function HeroSection() {
  const [introDone, setIntroDone] = useState(false);

  return (
    <div className="snap-start snap-always relative h-screen w-full">
      <DomeGalleryBackground
        overlayOpacity={0.7}
        overlayColor="#12040fff"
        autoRotate={true}
        autoRotateSpeed={2}
        showNoise={true}
        noiseAlpha={18}
        noiseRefreshInterval={2}
      >
        <div className="relative flex flex-col items-center justify-center h-screen px-4">
          {/* Fade-in gradient at top of hero screen */}
          <div
            className="absolute top-0 left-0 right-0 h-80 pointer-events-none z-30"
            style={{
              background: `linear-gradient(to bottom, #12040fff 0%, rgba(18, 4, 15, 0.95) 25%, rgba(18, 4, 15, 0.75) 50%, rgba(18, 4, 15, 0.4) 75%, transparent 100%)`,
            }}
          />

          <div className="text-center text-white w-full max-w-6xl space-y-6">
            <BlurText
              text="Welcome to Denn"
              delay={70}
              initialDelay={250}
              animateBy="words"
              direction="bottom"
              className="text-5xl md:text-7xl font-bold mb-1 font-mono justify-center drop-shadow-[0_4px_16px_rgba(0,0,0,0.6)]"
              stepDuration={0.25}
              onAnimationComplete={() => setIntroDone(true)}
            />

            <div className={`space-y-2 md:space-y-4 transition-opacity duration-400 ${introDone ? "opacity-100" : "opacity-0"}`}>
              <GradientText
                colors={["#f43f5e", "#ef4444", "#f97316"]}
                animationSpeed={6}
                animationDelayMs={250}
                backdropBlur={false}
                className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight leading-[1.25] pb-1 drop-shadow-[0_4px_16px_rgba(0,0,0,0.5)]"
              >
                Track and rate everything you love
              </GradientText>

              <p className="text-base md:text-lg text-gray-200 max-w-2xl mx-auto font-semibold drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)] font-sans">
                Your personal hub for movies, TV shows, games, books, and music.
                Create lists, share with friends, and never lose track of
                what&apos;s next.
              </p>
            </div>

            <div className={`flex flex-wrap gap-3 md:gap-4 justify-center items-center pt-3 md:pt-4 transition-opacity duration-400 ${introDone ? "opacity-100" : "opacity-0"}`}>
              <Link href="/login">
                <Button
                  size="lg"
                  className="bg-white text-black hover:bg-gray-200 text-base md:text-lg px-6 md:px-8 cursor-pointer shadow-lg shadow-black/30 hover:shadow-xl py-6"
                >
                  Sign In
                </Button>
              </Link>
              <Link href="/register">
                <Button
                  size="lg"
                  className="bg-gradient-to-r from-rose-500 via-red-500 to-orange-500 text-white hover:opacity-90 text-base md:text-lg px-8 md:px-10 cursor-pointer shadow-lg shadow-black/30 hover:shadow-xl py-6"
                >
                  Get Started
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </div>

            <div className={`flex flex-wrap gap-2.5 md:gap-3 justify-center pt-4 md:pt-6 transition-opacity duration-400 ${introDone ? "opacity-100" : "opacity-0"}`}>
              <Badge
                variant="outline"
                className="text-white border-white/30 bg-white/5 backdrop-blur-sm px-2.5 py-1 md:px-3 md:py-1.5 rounded-full text-xs md:text-sm shadow-md shadow-black/30"
              >
                <Film className="w-3 h-3 md:w-3.5 md:h-3.5" /> Movies
              </Badge>
              <Badge
                variant="outline"
                className="text-white border-white/30 bg-white/5 backdrop-blur-sm px-2.5 py-1 md:px-3 md:py-1.5 rounded-full text-xs md:text-sm shadow-md shadow-black/30"
              >
                <Tv className="w-3 h-3 md:w-3.5 md:h-3.5" /> TV Shows
              </Badge>
              <Badge
                variant="outline"
                className="text-white border-white/30 bg-white/5 backdrop-blur-sm px-2.5 py-1 md:px-3 md:py-1.5 rounded-full text-xs md:text-sm shadow-md shadow-black/30"
              >
                <Gamepad2 className="w-3 h-3 md:w-3.5 md:h-3.5" /> Games
              </Badge>
              <Badge
                variant="outline"
                className="text-white border-white/30 bg-white/5 backdrop-blur-sm px-2.5 py-1 md:px-3 md:py-1.5 rounded-full text-xs md:text-sm shadow-md shadow-black/30"
              >
                <Music className="w-3 h-3 md:w-3.5 md:h-3.5" /> Music
              </Badge>
              <Badge
                variant="outline"
                className="text-white border-white/30 bg-white/5 backdrop-blur-sm px-2.5 py-1 md:px-3 md:py-1.5 rounded-full text-xs md:text-sm shadow-md shadow-black/30"
              >
                <Book className="w-3 h-3 md:w-3.5 md:h-3.5" /> Books
              </Badge>
            </div>
          </div>

          {/* Scroll Indicator - higher z-index to stay above gradient */}
          <div className={`absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 animate-bounce z-40 transition-opacity duration-400 ${introDone ? "opacity-100" : "opacity-0"}`}>
            <p className="text-white/70 text-sm font-medium drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]">Scroll to explore</p>
            <ChevronDown className="w-6 h-6 text-white/70 drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]" />
          </div>

          {/* Fade-out gradient at bottom of hero screen */}
          <div
            className="absolute bottom-0 left-0 right-0 h-80 pointer-events-none z-30"
            style={{
              background: `linear-gradient(to bottom, transparent 0%, rgba(18, 4, 15, 0.4) 25%, rgba(18, 4, 15, 0.75) 50%, rgba(18, 4, 15, 0.95) 75%, #12040fff 100%)`,
            }}
          />
        </div>
      </DomeGalleryBackground>
    </div>
  );
}
