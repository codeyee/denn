"use client";

import { motion } from "motion/react";
import { Button } from "@/app/_components/ui/button";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { fadeInUp } from "./data";

export default function CallToActionSection() {
  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-15">
      <motion.div
        className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 backdrop-blur-md border border-white/20 rounded-3xl p-8 md:p-12 text-center space-y-6"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        variants={fadeInUp}
      >
        <h2 className="text-3xl md:text-5xl font-bold text-white">
          Ready to Get Started?
        </h2>
        <p className="text-lg text-gray-300 max-w-2xl mx-auto">
          Join Denn today and start organizing your entertainment life. Create
          your first list in seconds.
        </p>
        <div className="flex flex-wrap gap-4 justify-center pt-4">
          <Link href="/register">
            <Button
              size="lg"
              className="bg-white text-black hover:bg-gray-200 text-lg px-8"
            >
              Create Free Account
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
