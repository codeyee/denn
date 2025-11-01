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

  const layoutClasses = [
    "lg:col-span-4 xl:col-span-1 xl:col-start-auto",
    "lg:col-span-4 xl:col-span-1 xl:col-start-auto",
    "lg:col-span-4 xl:col-span-1 xl:col-start-auto",
    "lg:col-span-4 lg:col-start-3 xl:col-span-1 xl:col-start-auto",
    "md:mx-auto lg:col-span-4 lg:col-start-7 xl:col-span-1 xl:col-start-auto",
  ];

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
    <div className="w-full mx-auto max-w-screen-2xl 2xl:max-w-[1920px] px-4 sm:px-6 lg:px-8 pb-15">
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
          className="flex flex-wrap justify-center gap-4 md:gap-5 lg:grid lg:grid-cols-12 lg:justify-center xl:grid-cols-5 xl:gap-6 px-1 sm:px-2"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={staggerContainer}
        >
          {contentTypes.map((type, index) => (
            <motion.div
              key={type.slug}
              variants={scaleIn}
              className={`w-full md:basis-1/2 md:max-w-[360px] ${layoutClasses[index] ?? ""}`}
            >
              <SpotlightCard
                className="relative overflow-hidden rounded-2xl h-[480px] md:h-[480px] bg-transparent backdrop-blur-lg p-0! border-none!"
                spotlightColor="rgba(255, 255, 255, 0.1)"
              >
                {/* Background image */}
                <div
                  className="absolute inset-0 bg-center bg-cover"
                  style={{ backgroundImage: `url(${type.backgroundImage})` }}
                  aria-label={type.alt}
                />
                <div className="absolute inset-0 bg-black/20" />
                <div className="absolute inset-x-0 bottom-0 h-[55%] bg-linear-to-t from-black/95 via-black/40 to-transparent" />

                {/* Foreground content */}
                <div className="relative z-10 h-full flex flex-col">
                  <div className="mt-auto w-full px-6 pb-6 pt-5 space-y-4">
                    <div className="flex items-center gap-3 text-white mb-2">
                      <type.icon className="w-6 h-6 drop-shadow-[0_4px_12px_rgba(0,0,0,0.45)]" />
                      <span className="text-xl font-bold drop-shadow-[0_4px_16px_rgba(0,0,0,0.55)]">
                        {type.title}
                      </span>
                    </div>

                    {/* Provider attribution */}
                    <div className="flex items-center gap-1.5 text-xs text-white/80 font-sans drop-shadow-[0_3px_10px_rgba(0,0,0,0.6)]">
                      <span className="drop-shadow-[0_3px_10px_rgba(0,0,0,0.6)]">Powered by</span>
                      {type.provider.href ? (
                        <a
                          href={type.provider.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-semibold text-white leading-none drop-shadow-[0_3px_10px_rgba(0,0,0,0.6)]"
                          aria-label={`Powered by ${type.provider.name}`}
                        >
                          {type.provider.name}
                        </a>
                      ) : (
                        <span className="font-semibold text-white leading-none drop-shadow-[0_3px_10px_rgba(0,0,0,0.6)]">
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
