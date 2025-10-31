"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import SpotlightCard from "@/app/_components/ui/SpotlightCard";
import {
  defaultContentTypes,
  fetchContentTypes,
  fadeInUp,
  staggerContainer,
  scaleIn,
} from "./data";

export default function ContentTypesSection() {
  const [contentTypes, setContentTypes] = useState(defaultContentTypes);

  useEffect(() => {
    const controller = new AbortController();

    const loadContentTypes = async () => {
      const types = await fetchContentTypes({ signal: controller.signal });
      setContentTypes(types);
    };

    loadContentTypes().catch((error) => {
      if ((error as Error).name === "AbortError") {
        return;
      }

      console.error("Failed to fetch content types:", error);
    });

    return () => controller.abort();
  }, []);

  return (
    <div className="w-full max-w-[95vw] mx-auto px-3 sm:px-4 pb-15">
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
          <p className="text-lg text-gray-300 max-w-2xl mx-auto font-sans">
            Manage all your entertainment content across multiple platforms and
            formats
          </p>
        </motion.div>

        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 lg:gap-5 px-1 sm:px-2"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={staggerContainer}
        >
          {contentTypes.map((type) => (
            <motion.div key={type.slug} variants={scaleIn}>
              <SpotlightCard
                className="relative overflow-hidden rounded-2xl h-[480px] md:h-[480px] bg-black/30 backdrop-blur-lg p-0! border-none!"
                spotlightColor="rgba(255, 255, 255, 0.12)"
              >
                {/* Background image with gradient overlay */}
                <div
                  className="absolute inset-0 bg-center bg-cover"
                  style={{ backgroundImage: `url(${type.backgroundImage})` }}
                  aria-label={type.alt}
                />
                <div
                  className="absolute inset-0 bg-linear-to-br from-black/70 via-black/50 to-black/40"
                />

                {/* Foreground content */}
                <div className="relative h-full flex flex-col">
                  <div className="mt-auto w-full px-6 pb-6 pt-5 space-y-4">
                    <div className="flex items-center gap-3 text-white mb-2">
                      <type.icon className="w-8 h-8 drop-shadow-[0_4px_12px_rgba(0,0,0,0.45)]" />
                      <span className="text-xl font-bold">{type.title}</span>
                    </div>

                    {/* Provider attribution */}
                    <div className="flex items-center gap-1.5 text-xs text-white/80 font-sans">
                      <span>Powered by</span>
                      {type.provider.href ? (
                        <a
                          href={type.provider.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-semibold text-white leading-none"
                          aria-label={`Powered by ${type.provider.name}`}
                        >
                          {type.provider.name}
                        </a>
                      ) : (
                        <span className="font-semibold text-white leading-none">
                          {type.provider.name}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </SpotlightCard>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
