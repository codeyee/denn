"use client";

import { motion } from "motion/react";
import {
  List,
  Share2,
  Star,
  Users,
  TrendingUp,
  CheckCircle2,
  LucideIcon,
} from "lucide-react";

// Types
type Feature = {
  icon: LucideIcon;
  title: string;
  description: string;
};

// Features data
const features: Feature[] = [
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

const fadeInUp = {
  hidden: { opacity: 0, y: 60 },
  visible: {
    opacity: 1,
    y: 0,
  },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: {
    opacity: 1,
    scale: 1,
  },
};

export function FeaturesSection() {
  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-15">
      <div className="space-y-12">
        <motion.div
          className="text-center space-y-4"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={fadeInUp}
        >
          <h2 className="text-3xl md:text-5xl font-bold text-white">
            Powerful Features
          </h2>
          <p className="text-lg text-gray-300 max-w-2xl mx-auto font-sans">
            Everything you need to organize, share, and enjoy your content
          </p>
        </motion.div>

        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={staggerContainer}
        >
          {features.map((feature, index) => (
            <motion.div
              key={index}
              variants={scaleIn}
              className="p-6 bg-black/40 backdrop-blur-md border border-white/10 rounded-2xl hover:border-white/30 transition-all duration-300 group"
            >
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center group-hover:bg-white/20 transition-colors">
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-bold text-white">{feature.title}</h3>
                <p className="text-gray-300 font-sans">{feature.description}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
