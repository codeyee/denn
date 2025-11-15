"use client";

import { motion } from "motion/react";
import { Separator } from "@/app/_components/common/ui/Separator";

const fadeInUp = {
  hidden: { opacity: 0, y: 60 },
  visible: {
    opacity: 1,
    y: 0,
  },
};

export function Footer() {
  return (
    <motion.div
      className="w-full max-w-screen-2xl mx-auto px-8 pb-8 pt-10"
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      variants={fadeInUp}
    >
      <Separator className="bg-white/10 mb-8" />
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-gray-400">
        <p>&copy; 2025 Denn. All rights reserved.</p>
        <div className="flex gap-6">
          <a href="#" className="hover:text-white transition-colors">
            About
          </a>
          <a href="#" className="hover:text-white transition-colors">
            Privacy
          </a>
          <a href="#" className="hover:text-white transition-colors">
            Terms
          </a>
          <a href="#" className="hover:text-white transition-colors">
            Contact
          </a>
        </div>
      </div>
    </motion.div>
  );
}
