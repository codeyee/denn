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
  LucideIcon,
} from "lucide-react";

export type ContentType = {
  icon: LucideIcon;
  title: string;
  description: string;
  color: string;
};

export type Feature = {
  icon: LucideIcon;
  title: string;
  description: string;
};

export const contentTypes: ContentType[] = [
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

export const features: Feature[] = [
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

export const fadeInUp = {
  hidden: { opacity: 0, y: 60 },
  visible: {
    opacity: 1,
    y: 0,
  },
};

export const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

export const scaleIn = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: {
    opacity: 1,
    scale: 1,
  },
};
