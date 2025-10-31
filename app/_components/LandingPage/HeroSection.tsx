"use client";

import BlurText from "@/app/_components/ui/TextAnimations/BlurText";
import GradientText from "@/app/_components/ui/TextAnimations/GradientText";
import { Badge } from "@/app/_components/ui/badge";
import { Button } from "@/app/_components/ui/button";
import DomeGalleryBackground from "@/app/_components/Backgrounds/DomeGallery";
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
  return (
    <div className="snap-start snap-always relative h-screen w-full">
      <DomeGalleryBackground
        overlayOpacity={0.6}
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
              delay={100}
              initialDelay={500}
              animateBy="words"
              direction="bottom"
              className="text-4xl md:text-7xl font-bold mb-4 font-[family-name:var(--font-azeret-mono)] justify-center"
            />

            <div className="space-y-4">
              <GradientText
                colors={["#60a5fa", "#a78bfa", "#ec4899", "#60a5fa"]}
                animationSpeed={6}
                className="text-xl md:text-3xl"
              >
                Track Everything You Love
              </GradientText>

              <p className="text-lg md:text-xl text-gray-300 max-w-2xl mx-auto">
                Your personal hub for movies, TV shows, games, books, and music.
                Create lists, share with friends, and never lose track of
                what&apos;s next.
              </p>
            </div>

            <div className="flex flex-wrap gap-4 justify-center items-center pt-4">
              <Link href="/register">
                <Button
                  size="lg"
                  className="bg-white text-black hover:bg-gray-200 text-lg px-8"
                >
                  Get Started
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="/login">
                <Button
                  size="lg"
                  variant="outline"
                  className="text-white border-white hover:bg-white/10 text-lg px-8"
                >
                  Sign In
                </Button>
              </Link>
            </div>

            <div className="flex flex-wrap gap-3 justify-center pt-6">
              <Badge
                variant="outline"
                className="text-white border-white/30 bg-white/5 backdrop-blur-sm"
              >
                <Film className="w-3 h-3" /> Movies
              </Badge>
              <Badge
                variant="outline"
                className="text-white border-white/30 bg-white/5 backdrop-blur-sm"
              >
                <Tv className="w-3 h-3" /> TV Shows
              </Badge>
              <Badge
                variant="outline"
                className="text-white border-white/30 bg-white/5 backdrop-blur-sm"
              >
                <Gamepad2 className="w-3 h-3" /> Games
              </Badge>
              <Badge
                variant="outline"
                className="text-white border-white/30 bg-white/5 backdrop-blur-sm"
              >
                <Book className="w-3 h-3" /> Books
              </Badge>
              <Badge
                variant="outline"
                className="text-white border-white/30 bg-white/5 backdrop-blur-sm"
              >
                <Music className="w-3 h-3" /> Music
              </Badge>
            </div>
          </div>

          {/* Scroll Indicator - higher z-index to stay above gradient */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 animate-bounce z-40">
            <p className="text-white/70 text-sm font-medium">Scroll to explore</p>
            <ChevronDown className="w-6 h-6 text-white/70" />
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
