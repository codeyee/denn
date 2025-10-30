import TopMenu from "@/app/_components/TopMenu";
import BlurText from "@/app/_components/ui/TextAnimations/BlurText";
import GradientText from "@/app/_components/ui/TextAnimations/GradientText";
import { Badge } from "@/app/_components/ui/badge";
import { Button } from "@/app/_components/ui/button";
import SpotlightCard from "@/app/_components/ui/SpotlightCard";
import { Separator } from "@/app/_components/ui/separator";
import DomeGalleryBackground from "@/app/_components/Backgrounds/DomeGallery";
import {
  Film,
  Tv,
  Gamepad2,
  Book,
  Music,
  Users,
  Star,
  List,
  Share2,
  TrendingUp,
  CheckCircle2,
  ArrowRight,
  ChevronDown,
} from "lucide-react";
import Link from "next/link";

const contentTypes = [
  {
    icon: Film,
    title: "Movies",
    description: "Track your favorite films and discover new ones",
    color: "from-purple-500 to-pink-500",
  },
  {
    icon: Tv,
    title: "TV Shows",
    description: "Keep up with series across all platforms",
    color: "from-blue-500 to-cyan-500",
  },
  {
    icon: Gamepad2,
    title: "Video Games",
    description: "Manage your gaming library and backlog",
    color: "from-green-500 to-emerald-500",
  },
  {
    icon: Book,
    title: "Books",
    description: "Your personal reading list and reviews",
    color: "from-orange-500 to-red-500",
  },
  {
    icon: Music,
    title: "Music",
    description: "Curate albums and tracks you love",
    color: "from-pink-500 to-rose-500",
  },
];

const features = [
  {
    icon: List,
    title: "Create Custom Lists",
    description: "Organize your content exactly how you want it",
  },
  {
    icon: Share2,
    title: "Collaborative Lists",
    description: "Invite friends to build and manage lists together",
  },
  {
    icon: Star,
    title: "Rate & Review",
    description: "Share your thoughts with personalized ratings and comments",
  },
  {
    icon: Users,
    title: "Social Features",
    description: "Connect with others who share your taste",
  },
  {
    icon: TrendingUp,
    title: "Track Progress",
    description: "See your watching, reading, and playing statistics",
  },
  {
    icon: CheckCircle2,
    title: "Stay Organized",
    description: "Never forget what you want to watch, play, or read next",
  },
];

export default function Home() {
  return (
    <div className="relative min-h-screen w-full">
      <TopMenu />
      <DomeGalleryBackground
        overlayOpacity={0.6}
        overlayColor="#12040fff"
        autoRotate={true}
        autoRotateSpeed={2}
        showNoise={true}
        noiseAlpha={18}
        noiseRefreshInterval={2}
      >
        {/* Hero Section */}
        <div className="relative flex flex-col items-center justify-center h-screen px-4">
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
                Create lists, share with friends, and never lose track of what&apos;s next.
              </p>
            </div>

            <div className="flex flex-wrap gap-4 justify-center items-center pt-4">
              <Link href="/register">
                <Button size="lg" className="bg-white text-black hover:bg-gray-200 text-lg px-8">
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
              <Badge variant="outline" className="text-white border-white/30 bg-white/5 backdrop-blur-sm">
                <Film className="w-3 h-3" /> Movies
              </Badge>
              <Badge variant="outline" className="text-white border-white/30 bg-white/5 backdrop-blur-sm">
                <Tv className="w-3 h-3" /> TV Shows
              </Badge>
              <Badge variant="outline" className="text-white border-white/30 bg-white/5 backdrop-blur-sm">
                <Gamepad2 className="w-3 h-3" /> Games
              </Badge>
              <Badge variant="outline" className="text-white border-white/30 bg-white/5 backdrop-blur-sm">
                <Book className="w-3 h-3" /> Books
              </Badge>
              <Badge variant="outline" className="text-white border-white/30 bg-white/5 backdrop-blur-sm">
                <Music className="w-3 h-3" /> Music
              </Badge>
            </div>
          </div>

          {/* Scroll Indicator */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 animate-bounce">
            <p className="text-white/70 text-sm font-medium">Scroll to explore</p>
            <ChevronDown className="w-6 h-6 text-white/70" />
          </div>
        </div>

        {/* Content Types Section */}
        <div className="w-full max-w-7xl mx-auto px-4 py-32">
          <div className="space-y-12">
            <div className="text-center space-y-4">
              <h2 className="text-3xl md:text-5xl font-bold text-white">
                Everything in One Place
              </h2>
              <p className="text-lg text-gray-300 max-w-2xl mx-auto">
                Manage all your entertainment content across multiple platforms and formats
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 px-4">
              {contentTypes.map((type, index) => (
                <SpotlightCard
                  key={index}
                  className="p-6 bg-black/40 backdrop-blur-md border border-white/10 rounded-2xl"
                  spotlightColor="rgba(255, 255, 255, 0.15)"
                >
                  <div className="space-y-4">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${type.color} flex items-center justify-center`}>
                      <type.icon className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-white">{type.title}</h3>
                    <p className="text-gray-300">{type.description}</p>
                  </div>
                </SpotlightCard>
              ))}
              
              {/* Empty card for visual balance */}
              <SpotlightCard
                className="p-6 bg-gradient-to-br from-purple-500/20 to-pink-500/20 backdrop-blur-md border border-white/20 rounded-2xl flex items-center justify-center"
                spotlightColor="rgba(168, 85, 247, 0.3)"
              >
                <div className="text-center space-y-2">
                  <p className="text-2xl font-bold text-white">And More!</p>
                  <p className="text-gray-300">Continuously expanding</p>
                </div>
              </SpotlightCard>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="w-full max-w-7xl mx-auto px-4 py-20">
          <div className="space-y-12">
            <div className="text-center space-y-4">
              <h2 className="text-3xl md:text-5xl font-bold text-white">
                Powerful Features
              </h2>
              <p className="text-lg text-gray-300 max-w-2xl mx-auto">
                Everything you need to organize, share, and enjoy your content
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((feature, index) => (
                <div
                  key={index}
                  className="p-6 bg-black/40 backdrop-blur-md border border-white/10 rounded-2xl hover:border-white/30 transition-all duration-300 group"
                >
                  <div className="space-y-4">
                    <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center group-hover:bg-white/20 transition-colors">
                      <feature.icon className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-white">{feature.title}</h3>
                    <p className="text-gray-300">{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Stats Section */}
        <div className="w-full max-w-5xl mx-auto px-4 py-20">
            <div className="bg-black/40 backdrop-blur-md border border-white/10 rounded-3xl p-8 md:p-12">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="text-center space-y-2">
                  <div className="text-4xl md:text-5xl font-bold text-white">
                    <GradientText colors={["#60a5fa", "#a78bfa"]}>
                      5+
                    </GradientText>
                  </div>
                  <p className="text-gray-300 text-lg">Content Types</p>
                </div>
                <div className="text-center space-y-2">
                  <div className="text-4xl md:text-5xl font-bold text-white">
                    <GradientText colors={["#a78bfa", "#ec4899"]}>
                      ∞
                    </GradientText>
                  </div>
                  <p className="text-gray-300 text-lg">Lists to Create</p>
                </div>
                <div className="text-center space-y-2">
                  <div className="text-4xl md:text-5xl font-bold text-white">
                    <GradientText colors={["#ec4899", "#f97316"]}>
                      100%
                    </GradientText>
                  </div>
                  <p className="text-gray-300 text-lg">Free to Use</p>
                </div>
              </div>
            </div>
        </div>

        {/* CTA Section */}
        <div className="w-full max-w-4xl mx-auto px-4 py-20">
          <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 backdrop-blur-md border border-white/20 rounded-3xl p-8 md:p-12 text-center space-y-6">
            <h2 className="text-3xl md:text-5xl font-bold text-white">
              Ready to Get Started?
            </h2>
            <p className="text-lg text-gray-300 max-w-2xl mx-auto">
              Join Denn today and start organizing your entertainment life. 
              Create your first list in seconds.
            </p>
            <div className="flex flex-wrap gap-4 justify-center pt-4">
              <Link href="/register">
                <Button size="lg" className="bg-white text-black hover:bg-gray-200 text-lg px-8">
                  Create Free Account
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="w-full max-w-7xl mx-auto px-4 pb-8">
          <Separator className="bg-white/10 mb-8" />
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-gray-400">
            <p>&copy; 2025 Denn. All rights reserved.</p>
            <div className="flex gap-6">
              <a href="#" className="hover:text-white transition-colors">About</a>
              <a href="#" className="hover:text-white transition-colors">Privacy</a>
              <a href="#" className="hover:text-white transition-colors">Terms</a>
              <a href="#" className="hover:text-white transition-colors">Contact</a>
            </div>
          </div>
        </div>
      </DomeGalleryBackground>
    </div>
  );
}
