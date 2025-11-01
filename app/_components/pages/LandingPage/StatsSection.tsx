"use client";

import { motion } from "motion/react";
import GradientText from "@/app/_components/ui/TextAnimations/GradientText";
import { scaleIn } from "./data";

export default function StatsSection() {
  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-15">
      <motion.div
        className="bg-black/40 backdrop-blur-md border border-white/10 rounded-3xl p-8 md:p-12"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        variants={scaleIn}
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="text-center space-y-2">
            <div className="text-4xl md:text-5xl font-bold text-white">
              <GradientText colors={["#60a5fa", "#a78bfa"]}>5+</GradientText>
            </div>
            <p className="text-gray-300 text-lg">Content Types</p>
          </div>
          <div className="text-center space-y-2">
            <div className="text-4xl md:text-5xl font-bold text-white">
              <GradientText colors={["#a78bfa", "#ec4899"]}>∞</GradientText>
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
      </motion.div>
    </div>
  );
}
