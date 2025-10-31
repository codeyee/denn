"use client";

import { motion } from "motion/react";
import SpotlightCard from "@/app/_components/ui/SpotlightCard";
import { contentTypes, fadeInUp, staggerContainer, scaleIn } from "./data";

export default function ContentTypesSection() {
  return (
    <div className="w-full max-w-7xl mx-auto px-4 pb-15">
      <div className="space-y-12">
        <motion.div
          className="text-center space-y-4"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={fadeInUp}
        >
          <h2 className="text-3xl md:text-5xl font-bold text-white">
            Everything in One Place
          </h2>
          <p className="text-lg text-gray-300 max-w-2xl mx-auto">
            Manage all your entertainment content across multiple platforms and
            formats
          </p>
        </motion.div>

        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 px-4"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={staggerContainer}
        >
          {contentTypes.map((type, index) => (
            <motion.div key={index} variants={scaleIn}>
              <SpotlightCard
                className="p-6 bg-black/40 backdrop-blur-md border border-white/10 rounded-2xl h-full"
                spotlightColor="rgba(255, 255, 255, 0.15)"
              >
                <div className="space-y-4">
                  <div
                    className={`w-12 h-12 rounded-xl bg-gradient-to-br ${type.color} flex items-center justify-center`}
                  >
                    <type.icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-white">{type.title}</h3>
                  <p className="text-gray-300">{type.description}</p>
                </div>
              </SpotlightCard>
            </motion.div>
          ))}

          {/* Empty card for visual balance */}
          <motion.div variants={scaleIn}>
            <SpotlightCard
              className="p-6 bg-gradient-to-br from-purple-500/20 to-pink-500/20 backdrop-blur-md border border-white/20 rounded-2xl flex items-center justify-center h-full"
              spotlightColor="rgba(168, 85, 247, 0.3)"
            >
              <div className="text-center space-y-2">
                <p className="text-2xl font-bold text-white">And More!</p>
                <p className="text-gray-300">Continuously expanding</p>
              </div>
            </SpotlightCard>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
