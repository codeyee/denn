
import { motion, useReducedMotion } from "motion/react";
import { Link } from "@tanstack/react-router";
import { Separator } from "@/components/common/ui/Separator";

const fadeInUp = {
  hidden: { opacity: 0, y: 60 },
  visible: {
    opacity: 1,
    y: 0,
  },
};

export function Footer() {
  const shouldReduceMotion = useReducedMotion();
  return (
    <motion.footer
      className="layout-content pb-8 pt-10"
      initial={shouldReduceMotion ? false : "hidden"}
      whileInView="visible"
      viewport={{ once: true }}
      variants={fadeInUp}
    >
      <Separator className="bg-white/10 mb-8" />
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-gray-400">
        <p>&copy; 2026 Denn. All rights reserved.</p>
        <nav aria-label="Legal and project information" className="flex flex-wrap justify-center gap-x-6 gap-y-2">
          <Link to="/" className="inline-flex min-h-11 items-center hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
            Explore
          </Link>
          <Link to="/browse" className="inline-flex min-h-11 items-center hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
            Browse
          </Link>
          <Link to="/about" className="inline-flex min-h-11 items-center hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
            About
          </Link>
          <Link to="/privacy" className="inline-flex min-h-11 items-center hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
            Privacy
          </Link>
          <Link to="/terms" className="inline-flex min-h-11 items-center hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
            Terms
          </Link>
          <Link to="/contact" className="inline-flex min-h-11 items-center hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
            Contact
          </Link>
        </nav>
      </div>
    </motion.footer>
  );
}
