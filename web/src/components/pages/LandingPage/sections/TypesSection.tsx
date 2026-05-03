
import { motion } from "motion/react";
import { LandingCard } from "@/components/common/cards/LandingCard";
import { useContentTypes } from "../hooks/useContentTypes";

const ANIMATION_VARIANTS = {
  fadeInUp: {
    hidden: { opacity: 0, y: 60 },
    visible: {
      opacity: 1,
      y: 0,
    },
  },
  staggerContainer: {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  },
  scaleIn: {
    hidden: { opacity: 0, scale: 0.8 },
    visible: {
      opacity: 1,
      scale: 1,
    },
  },
} as const;

const LAYOUT_CLASSES = [
  "lg:col-span-4 xl:col-span-1 xl:col-start-auto",
  "lg:col-span-4 xl:col-span-1 xl:col-start-auto",
  "lg:col-span-4 xl:col-span-1 xl:col-start-auto",
  "lg:col-span-4 lg:col-start-3 xl:col-span-1 xl:col-start-auto",
  "md:mx-auto lg:col-span-4 lg:col-start-7 xl:col-span-1 xl:col-start-auto",
] as const;

export function TypesSection() {
  const contentTypes = useContentTypes();

  return (
    <div className="w-full mx-auto max-w-screen-2xl 2xl:max-w-[1920px] px-4 sm:px-6 lg:px-8 pb-15">
      <div className="space-y-12">
        <motion.div
          className="text-center space-y-4"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={ANIMATION_VARIANTS.fadeInUp}
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
          variants={ANIMATION_VARIANTS.staggerContainer}
        >
          {contentTypes.map((type, index) => (
            <motion.div
              key={type.slug}
              variants={ANIMATION_VARIANTS.scaleIn}
              className={`w-full md:basis-1/2 md:max-w-[360px] ${LAYOUT_CLASSES[index] ?? ""}`}
            >
              <LandingCard
                id={type.slug}
                title={type.title}
                icon={type.icon}
                backgroundImage={type.backgroundImage}
                backgroundImageAlt={type.alt}
                providers={type.providers}
              />
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
