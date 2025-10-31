"use client";

import { motion } from "motion/react";
import { features, fadeInUp, staggerContainer, scaleIn } from "./data";

export default function FeaturesSection() {
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
          <p className="text-lg text-gray-300 max-w-2xl mx-auto">
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
                <p className="text-gray-300">{feature.description}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
